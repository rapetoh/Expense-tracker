import { jwtVerify } from 'jose';
import sql from './sql.js';

/**
 * Extract user ID from JWT token in Authorization header
 * Returns { userId: string | null, error: Response | null }
 */
export async function getUserIdFromRequest(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { userId: null, error: null };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    
    if (payload && payload.sub) {
      return { userId: payload.sub, error: null };
    }
    
    return { userId: null, error: null };
  } catch (e) {
    // Token invalid or expired
    return { userId: null, error: null };
  }
}

/**
 * Require user ID from JWT token - for production-ready user-based data
 * Returns { userId: string, error: null } or { userId: null, error: Response }
 */
export async function requireUserId(request) {
  const { userId, error } = await getUserIdFromRequest(request);
  
  if (error) return { userId: null, error };
  
  if (!userId) {
    return {
      userId: null,
      error: Response.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 },
      ),
    };
  }
  
  return { userId, error: null };
}

/**
 * Ensure user settings exist (create if missing)
 * Returns the settings row or null
 */
export async function ensureUserSettings(userId) {
  // Create settings row if missing (idempotent)
  await sql(
    "INSERT INTO public.device_settings (user_id) SELECT $1 WHERE NOT EXISTS (SELECT 1 FROM public.device_settings WHERE user_id = $1)",
    [userId],
  );

  const rows = await sql(
    "SELECT * FROM public.device_settings WHERE user_id = $1 LIMIT 1",
    [userId],
  );
  return rows[0] || null;
}

/**
 * Get user ID or device ID from request
 * Prefers user ID from JWT, falls back to device ID
 * Returns { userId: string | null, deviceId: string | null, error: Response | null }
 * 
 * @deprecated Use requireUserId for production-ready user-based data
 */
export async function getUserOrDeviceId(request) {
  const { userId } = await getUserIdFromRequest(request);
  
  if (userId) {
    return { userId, deviceId: null, error: null };
  }
  
  // Fallback to device ID
  const deviceId = request.headers.get('x-device-id');
  if (deviceId && String(deviceId).trim()) {
    return { userId: null, deviceId: String(deviceId).trim(), error: null };
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
