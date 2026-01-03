import sql from "@/app/api/utils/sql";

export function getDeviceIdFromRequest(request) {
  const deviceId = request.headers.get("x-device-id");
  if (!deviceId || !String(deviceId).trim()) {
    return null;
  }
  return String(deviceId).trim();
}

export async function ensureDeviceSettings(deviceId) {
  // Create settings row if missing (idempotent)
  await sql(
    "INSERT INTO public.device_settings (device_id) SELECT $1 WHERE NOT EXISTS (SELECT 1 FROM public.device_settings WHERE device_id = $1)",
    [deviceId],
  );

  const rows = await sql(
    "SELECT * FROM public.device_settings WHERE device_id = $1 LIMIT 1",
    [deviceId],
  );
  return rows[0] || null;
}

export function requireDeviceId(request) {
  const deviceId = getDeviceIdFromRequest(request);
  if (!deviceId) {
    return {
      deviceId: null,
      error: Response.json(
        { error: "Missing x-device-id header" },
        { status: 400 },
      ),
    };
  }
  return { deviceId, error: null };
}
