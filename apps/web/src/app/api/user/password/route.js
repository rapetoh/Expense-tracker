import { hash, verify } from 'argon2';
import { getUserIdFromRequest } from '../../utils/user.js';
import sql from '../../utils/sql.js';

/**
 * PUT /api/user/password - Change user password
 */
export async function PUT(request) {
  const { userId, error } = await getUserIdFromRequest(request);
  
  if (error) return error;
  if (!userId) {
    return Response.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return Response.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return Response.json(
        { error: 'Passwords must be strings' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return Response.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Get current password hash
    const accountRows = await sql(
      'SELECT password FROM auth_accounts WHERE "userId" = $1 AND provider = $2',
      [userId, 'credentials']
    );

    if (accountRows.length === 0) {
      return Response.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    const account = accountRows[0];
    if (!account.password) {
      return Response.json(
        { error: 'Password change not supported for this account type' },
        { status: 400 }
      );
    }

    // Verify current password
    const isValid = await verify(account.password, currentPassword);
    if (!isValid) {
      return Response.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password and update
    const hashedPassword = await hash(newPassword);
    await sql(
      'UPDATE auth_accounts SET password = $1 WHERE "userId" = $2 AND provider = $3',
      [hashedPassword, userId, 'credentials']
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
