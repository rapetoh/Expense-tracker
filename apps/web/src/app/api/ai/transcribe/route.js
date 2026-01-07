import { requireUserId } from "../../utils/user";

function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { controller, cancel: () => clearTimeout(id) };
}

export async function POST(request) {
  const { error } = await requireUserId(request);
  if (error) return error;

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return Response.json(
      { error: "OpenAI API key not configured" },
      { status: 500 },
    );
  }

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

  // Convert arrayBuffer to Buffer, then create File object for FormData compatibility
  const buffer = Buffer.from(arrayBuffer);
  
  // A name is required for some multipart parsers.
  const inferredExt = contentType.includes("wav")
    ? "wav"
    : contentType.includes("mpeg")
      ? "mp3"
      : contentType.includes("caf")
        ? "caf"
        : "m4a";

  const form = new FormData();
  // Use File constructor instead of Blob for proper FormData handling in Node.js
  const file = new File([buffer], `voice.${inferredExt}`, { type: contentType });
  form.append("file", file);
  form.append("model", "whisper-1"); // OpenAI Whisper model

  const resTimeout = withTimeout(25_000);

  let res;
  try {
    res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
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
    console.error("OpenAI Whisper API error:", errText);
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
