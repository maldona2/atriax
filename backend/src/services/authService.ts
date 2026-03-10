import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, sql } from 'drizzle-orm';
import { db, users } from '../db/client.js';

const TOKEN_EXPIRY = '30d';

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    tenantId: string | null;
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const [user] = await db
    .select()
    .from(users)
    .where(
      sql`lower(${users.email}) = lower(${email}) AND ${users.isActive} = true`
    )
    .limit(1);

  if (!user) {
    const err = new Error('Invalid credentials');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error('Invalid credentials');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    },
    secret,
    { expiresIn: TOKEN_EXPIRY }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
    },
  };
}

export async function me(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.isActive) {
    const err = new Error('User not found');
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    tenantId: user.tenantId,
  };
}
