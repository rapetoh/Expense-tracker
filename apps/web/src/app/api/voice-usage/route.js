import sql from "@/app/api/utils/sql";
import { ensureDeviceSettings, requireDeviceId } from "@/app/api/utils/device";

const FREE_VOICE_LIMIT_PER_MONTH = 10;

function monthKeyFromDate(date = new Date()) {
  // YYYY-MM in UTC
  return date.toISOString().slice(0, 7);
}

export async function GET(request) {
  const { deviceId, error } = requireDeviceId(request);
  if (error) return error;

  await ensureDeviceSettings(deviceId);

  const { searchParams } = new URL(request.url);
  const monthKey = searchParams.get("month") || monthKeyFromDate();

  await sql(
    "INSERT INTO public.voice_usage (device_id, month_key) VALUES ($1, $2) ON CONFLICT (device_id, month_key) DO NOTHING",
    [deviceId, monthKey],
  );

  const rows = await sql(
    "SELECT used_count FROM public.voice_usage WHERE device_id = $1 AND month_key = $2 LIMIT 1",
    [deviceId, monthKey],
  );

  const used = rows[0]?.used_count ?? 0;

  return Response.json({
    month_key: monthKey,
    used,
    limit: FREE_VOICE_LIMIT_PER_MONTH,
    remaining: Math.max(0, FREE_VOICE_LIMIT_PER_MONTH - used),
  });
}

export async function POST(request) {
  const { deviceId, error } = requireDeviceId(request);
  if (error) return error;

  await ensureDeviceSettings(deviceId);

  const body = await request.json().catch(() => ({}));
  const monthKey = body?.month_key || monthKeyFromDate();
  const deltaRaw = body?.delta;
  const delta = Number.isFinite(deltaRaw) ? Number(deltaRaw) : 1;

  // Ensure row exists
  await sql(
    "INSERT INTO public.voice_usage (device_id, month_key) VALUES ($1, $2) ON CONFLICT (device_id, month_key) DO NOTHING",
    [deviceId, monthKey],
  );

  // Increment path (guarded by limit)
  if (delta > 0) {
    const updated = await sql(
      "UPDATE public.voice_usage SET used_count = used_count + $3, updated_at = now() WHERE device_id = $1 AND month_key = $2 AND used_count + $3 <= $4 RETURNING used_count",
      [deviceId, monthKey, delta, FREE_VOICE_LIMIT_PER_MONTH],
    );

    if (updated.length === 0) {
      const rows = await sql(
        "SELECT used_count FROM public.voice_usage WHERE device_id = $1 AND month_key = $2 LIMIT 1",
        [deviceId, monthKey],
      );
      const used = rows[0]?.used_count ?? FREE_VOICE_LIMIT_PER_MONTH;

      return Response.json({
        allowed: false,
        month_key: monthKey,
        used,
        limit: FREE_VOICE_LIMIT_PER_MONTH,
        remaining: Math.max(0, FREE_VOICE_LIMIT_PER_MONTH - used),
      });
    }

    const used = updated[0].used_count;

    return Response.json({
      allowed: true,
      month_key: monthKey,
      used,
      limit: FREE_VOICE_LIMIT_PER_MONTH,
      remaining: Math.max(0, FREE_VOICE_LIMIT_PER_MONTH - used),
    });
  }

  // Decrement path (best-effort rollback, never below 0)
  const dec = Math.abs(delta);
  await sql(
    "UPDATE public.voice_usage SET used_count = GREATEST(0, used_count - $3), updated_at = now() WHERE device_id = $1 AND month_key = $2",
    [deviceId, monthKey, dec],
  );

  const rows = await sql(
    "SELECT used_count FROM public.voice_usage WHERE device_id = $1 AND month_key = $2 LIMIT 1",
    [deviceId, monthKey],
  );

  const used = rows[0]?.used_count ?? 0;

  return Response.json({
    allowed: true,
    month_key: monthKey,
    used,
    limit: FREE_VOICE_LIMIT_PER_MONTH,
    remaining: Math.max(0, FREE_VOICE_LIMIT_PER_MONTH - used),
  });
}
