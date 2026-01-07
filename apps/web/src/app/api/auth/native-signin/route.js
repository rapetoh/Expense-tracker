import { verify } from 'argon2';
import sql from '../../utils/sql.js';
import { SignJWT } from 'jose';

/**
 * Native signin endpoint - accepts email/password and returns JWT
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user from database
    const userRows = await sql(
      'SELECT * FROM auth_users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (userRows.length === 0) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = userRows[0];

    // Get account with password
    const accountRows = await sql(
      'SELECT * FROM auth_accounts WHERE "userId" = $1 AND provider = $2',
      [user.id, 'credentials']
    );

    if (accountRows.length === 0) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const account = accountRows[0];
    const hashedPassword = account.password;

    if (!hashedPassword) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verify(hashedPassword, password);
    if (!isValid) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token using the same format as Auth.js
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
    console.error('Native signin error:', error);
    return Response.json(
      { error: 'An error occurred during sign in' },
      { status: 500 }
    );
  }
}

