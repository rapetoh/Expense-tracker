import sql from "../utils/sql";
import { requireUserId, ensureUserSettings } from "../utils/user";

const FREE_SCAN_LIMIT_PER_MONTH = 5;

function monthKeyFromDate(date = new Date()) {
  // YYYY-MM in UTC
  return date.toISOString().slice(0, 7);
}

export async function GET(request) {
  const { userId, error } = await requireUserId(request);
  if (error) return error;

  await ensureUserSettings(userId);

  const { searchParams } = new URL(request.url);
  const monthKey = searchParams.get("month") || monthKeyFromDate();

  await sql(
    "INSERT INTO public.scan_usage (user_id, month_key) VALUES ($1, $2) ON CONFLICT (user_id, month_key) DO NOTHING",
    [userId, monthKey],
  );

  const rows = await sql(
    "SELECT used_count FROM public.scan_usage WHERE user_id = $1 AND month_key = $2 LIMIT 1",
    [userId, monthKey],
  );

  const used = rows[0]?.used_count ?? 0;

  return Response.json({
    month_key: monthKey,
    used,
    limit: FREE_SCAN_LIMIT_PER_MONTH,
    remaining: Math.max(0, FREE_SCAN_LIMIT_PER_MONTH - used),
  });
}

export async function POST(request) {
  const { userId, error } = await requireUserId(request);
  if (error) return error;

  await ensureUserSettings(userId);

  const body = await request.json().catch(() => ({}));
  const monthKey = body?.month_key || monthKeyFromDate();
  const deltaRaw = body?.delta;
  const delta = Number.isFinite(deltaRaw) ? Number(deltaRaw) : 1;

  // Ensure row exists
  await sql(
    "INSERT INTO public.scan_usage (user_id, month_key) VALUES ($1, $2) ON CONFLICT (user_id, month_key) DO NOTHING",
    [userId, monthKey],
  );

  // Increment path (guarded by limit)
  if (delta > 0) {
    const updated = await sql(
      "UPDATE public.scan_usage SET used_count = used_count + $3, updated_at = now() WHERE user_id = $1 AND month_key = $2 AND used_count + $3 <= $4 RETURNING used_count",
      [userId, monthKey, delta, FREE_SCAN_LIMIT_PER_MONTH],
    );

    if (updated.length === 0) {
      const rows = await sql(
        "SELECT used_count FROM public.scan_usage WHERE user_id = $1 AND month_key = $2 LIMIT 1",
        [userId, monthKey],
      );
      const used = rows[0]?.used_count ?? FREE_SCAN_LIMIT_PER_MONTH;

      return Response.json({
        allowed: false,
        month_key: monthKey,
        used,
        limit: FREE_SCAN_LIMIT_PER_MONTH,
        remaining: Math.max(0, FREE_SCAN_LIMIT_PER_MONTH - used),
      });
    }

    const used = updated[0].used_count;

    return Response.json({
      allowed: true,
      month_key: monthKey,
      used,
      limit: FREE_SCAN_LIMIT_PER_MONTH,
      remaining: Math.max(0, FREE_SCAN_LIMIT_PER_MONTH - used),
    });
  }

  // Decrement path (best-effort rollback, never below 0)
  const dec = Math.abs(delta);
  await sql(
    "UPDATE public.scan_usage SET used_count = GREATEST(0, used_count - $3), updated_at = now() WHERE user_id = $1 AND month_key = $2",
    [userId, monthKey, dec],
  );

  const rows = await sql(
    "SELECT used_count FROM public.scan_usage WHERE user_id = $1 AND month_key = $2 LIMIT 1",
    [userId, monthKey],
  );

  const used = rows[0]?.used_count ?? 0;

  return Response.json({
    allowed: true,
    month_key: monthKey,
    used,
    limit: FREE_SCAN_LIMIT_PER_MONTH,
    remaining: Math.max(0, FREE_SCAN_LIMIT_PER_MONTH - used),
  });
}
