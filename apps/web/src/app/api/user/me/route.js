import { getUserIdFromRequest } from '@/app/api/utils/user';
import sql from '@/app/api/utils/sql';

/**
 * GET /api/user/me - Get current authenticated user info
 */
export async function GET(request) {
  const { userId, error } = await getUserIdFromRequest(request);
  
  if (error) return error;
  if (!userId) {
    return Response.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const userRows = await sql(
      'SELECT id, email, name, image, "emailVerified" FROM auth_users WHERE id = $1',
      [userId]
    );

    if (userRows.length === 0) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userRows[0];
    return Response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
