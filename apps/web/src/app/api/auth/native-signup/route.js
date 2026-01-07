import { hash } from 'argon2';
import sql from '../../utils/sql';
import { SignJWT } from 'jose';

/**
 * Native signup endpoint - accepts email/password/name and returns JWT
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password, name } = body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingRows = await sql(
      'SELECT * FROM auth_users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existingRows.length > 0) {
      return Response.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Create user
    const userId = crypto.randomUUID();
    const userRows = await sql(
      'INSERT INTO auth_users (id, email, name, "emailVerified") VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, email.toLowerCase().trim(), name || null, null]
    );

    const user = userRows[0];

    // Hash password and create account
    const hashedPassword = await hash(password);
    await sql(
      'INSERT INTO auth_accounts ("userId", provider, "providerAccountId", type, password) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'credentials', userId, 'credentials', hashedPassword]
    );

    // Generate JWT token
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
      },
    });
  } catch (error) {
    console.error('Native signup error:', error);
    return Response.json(
      { error: 'An error occurred during sign up' },
      { status: 500 }
    );
  }
}

