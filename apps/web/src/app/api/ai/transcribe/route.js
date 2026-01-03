import { requireDeviceId } from "@/app/api/utils/device";

// Removed getBaseUrlFromRequest - no longer needed for direct OpenAI API calls

function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { controller, cancel: () => clearTimeout(id) };
}

export async function POST(request) {
  const { error } = requireDeviceId(request);
  if (error) return error;

  const contentType =
    request.headers.get("content-type") || "application/octet-stream";

  let arrayBuffer;
  try {
    arrayBuffer = await request.arrayBuffer();
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: "Could not read audio bytes" },
      { status: 400 },
    );
  }

  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return Response.json({ error: "Empty audio body" }, { status: 400 });
  }

  // Guard against corrupted/too-short uploads that can hang upstream.
  if (arrayBuffer.byteLength < 256) {
    return Response.json(
      { error: "Audio too short to transcribe" },
      { status: 400 },
    );
  }

  const blob = new Blob([arrayBuffer], { type: contentType });
  const form = new FormData();

  // A name is required for some multipart parsers.
  const inferredExt = contentType.includes("wav")
    ? "wav"
    : contentType.includes("mpeg")
      ? "mp3"
      : contentType.includes("caf")
        ? "caf"
        : "m4a";

  form.append("file", blob, `voice.${inferredExt}`);
  form.append("model", "whisper-1");

  const resTimeout = withTimeout(25_000);

  // Check for OpenAI API key
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return Response.json(
      { error: "OpenAI API key not configured" },
      { status: 500 },
    );
  }

  let res;
  try {
    res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        Accept: "application/json",
      },
      body: form,
      signal: resTimeout.controller.signal,
    });
  } catch (e) {
    console.error(e);
    const isAbort = e instanceof Error && e.name === "AbortError";
    return Response.json(
      {
        error: isAbort
          ? "Transcription timed out"
          : "Transcription request failed",
      },
      { status: 502 },
    );
  } finally {
    resTimeout.cancel();
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return Response.json(
      {
        error: `Transcription failed: ${res.status} ${res.statusText}`,
        details: errText,
      },
      { status: 502 },
    );
  }

  const data = await res.json().catch(() => null);
  const text = data?.text ? String(data.text) : "";

  return Response.json({ text });
}
