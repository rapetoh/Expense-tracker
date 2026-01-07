import sql from "./sql.js";
import { getUserIdFromRequest } from "./user";

export function getDeviceIdFromRequest(request) {
  const deviceId = request.headers.get("x-device-id");
  if (!deviceId || !String(deviceId).trim()) {
    return null;
  }
  return String(deviceId).trim();
}

/**
 * Get user ID or device ID from request
 * Prefers user ID from JWT, falls back to device ID
 * For production, we should require auth, but keeping device ID as fallback for now
 */
export async function getUserOrDeviceId(request) {
  const { userId } = await getUserIdFromRequest(request);
  
  if (userId) {
    return { userId, deviceId: null, error: null };
  }
  
  // Fallback to device ID (for backward compatibility)
  const deviceId = getDeviceIdFromRequest(request);
  if (deviceId) {
    return { userId: null, deviceId, error: null };
  }
  
  return {
    userId: null,
    deviceId: null,
    error: Response.json(
      { error: 'Authentication required. Please sign in.' },
      { status: 401 },
    ),
  };
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
