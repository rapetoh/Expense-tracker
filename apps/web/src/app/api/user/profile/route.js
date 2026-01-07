import { getUserIdFromRequest } from '../../utils/user.js';
import sql from '../../utils/sql.js';
import { SignJWT } from 'jose';

/**
 * PUT /api/user/profile - Update user name and/or email
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
    const { name, email } = body;

    // Validate at least one field is provided
    if (name === undefined && email === undefined) {
      return Response.json(
        { error: 'Name or email is required' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email !== undefined) {
      if (typeof email !== 'string' || !email.trim()) {
        return Response.json(
          { error: 'Email must be a non-empty string' },
          { status: 400 }
        );
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return Response.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Validate name if provided
    if (name !== undefined && typeof name !== 'string') {
      return Response.json(
        { error: 'Name must be a string' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    if (email !== undefined) {
      const existingRows = await sql(
        'SELECT id FROM auth_users WHERE email = $1 AND id != $2',
        [email.toLowerCase().trim(), userId]
      );
      if (existingRows.length > 0) {
        return Response.json(
          { error: 'Email is already taken' },
          { status: 409 }
        );
      }
    }

    // Build update query
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(name ? name.trim() : null);
    }

    if (email !== undefined) {
      setClauses.push(`email = $${paramIndex++}`);
      values.push(email.toLowerCase().trim());
    }

    if (setClauses.length === 0) {
      // No fields to update
      const userRows = await sql(
        'SELECT id, email, name, image, "emailVerified" FROM auth_users WHERE id = $1',
        [userId]
      );
      return Response.json(userRows[0] || {});
    }

    values.push(userId);
    const query = `UPDATE auth_users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, name, image, "emailVerified"`;
    
    const userRows = await sql(query, values);
    const user = userRows[0];

    // Generate new JWT with updated user info
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const jwt = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret);

    return Response.json({
      jwt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
