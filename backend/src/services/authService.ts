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
    isVerified: boolean;
  };
}

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
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

  if (!user.isVerified) {
    const err = new Error('Email no verificado. Revisa tu bandeja de entrada para verificar tu cuenta.');
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
      isVerified: user.isVerified,
    },
  };
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  tenantId: string | null;
  isVerified?: boolean;
  phone?: string | null;
  specialty?: string | null;
  licenseNumber?: string | null;
  address?: string | null;
  bio?: string | null;
  education?: Array<{
    degree: string;
    institution: string;
    year: number;
  }> | null;
  workingHours?: { start: string; end: string; days: string[] } | null;
  appointmentDuration?: number | null;
  avatarUrl?: string | null;
}

function toProfile(user: typeof users.$inferSelect): UserProfile {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    tenantId: user.tenantId,
    phone: user.phone ?? null,
    specialty: user.specialty ?? null,
    licenseNumber: user.licenseNumber ?? null,
    address: user.address ?? null,
    bio: user.bio ?? null,
    education: user.education ?? null,
    workingHours: user.workingHours ?? null,
    appointmentDuration: user.appointmentDuration ?? null,
    avatarUrl: user.avatarUrl ?? null,
    isVerified: user.isVerified,
  };
}

export async function me(userId: string): Promise<UserProfile> {
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

  return toProfile(user);
}

const SALT_ROUNDS = 12;

export interface UpdateProfileInput {
  fullName?: string;
  email?: string;
  phone?: string | null;
  specialty?: string | null;
  licenseNumber?: string | null;
  address?: string | null;
  bio?: string | null;
  education?: Array<{
    degree: string;
    institution: string;
    year: number;
  }> | null;
  workingHours?: { start: string; end: string; days: string[] } | null;
  appointmentDuration?: number | null;
  avatarUrl?: string | null;
}

export async function updateProfile(
  userId: string,
  data: UpdateProfileInput
): Promise<UserProfile> {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existing || !existing.isActive) {
    const err = new Error('User not found');
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (data.fullName !== undefined) updates.fullName = data.fullName || null;
  if (data.email !== undefined) {
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        sql`lower(${users.email}) = lower(${data.email}) AND ${users.id} != ${userId}`
      )
      .limit(1);
    if (taken) {
      const err = new Error('Email already in use');
      (err as Error & { statusCode?: number }).statusCode = 400;
      throw err;
    }
    updates.email = data.email;
  }
  if (data.phone !== undefined) updates.phone = data.phone ?? null;
  if (data.specialty !== undefined) updates.specialty = data.specialty ?? null;
  if (data.licenseNumber !== undefined)
    updates.licenseNumber = data.licenseNumber ?? null;
  if (data.address !== undefined) updates.address = data.address ?? null;
  if (data.bio !== undefined) updates.bio = data.bio ?? null;
  if (data.education !== undefined) updates.education = data.education ?? null;
  if (data.workingHours !== undefined)
    updates.workingHours = data.workingHours ?? null;
  if (data.appointmentDuration !== undefined)
    updates.appointmentDuration = data.appointmentDuration ?? null;
  if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl ?? null;

  const [updated] = await db
    .update(users)
    .set(updates as Partial<typeof users.$inferInsert>)
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    const err = new Error('User not found');
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }

  return toProfile(updated);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
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

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    const err = new Error('Current password is incorrect');
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
