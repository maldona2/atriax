import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, asc, sql } from 'drizzle-orm';
import { db, tenants, users } from '../db/client.js';

const SALT_ROUNDS = 10;

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: Date | null;
  user_email?: string;
}

export interface CreateTenantInput {
  name: string;
  slug?: string;
  email: string;
  password: string;
  fullName?: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toRow(
  tenant: typeof tenants.$inferSelect,
  userEmail?: string
): TenantRow {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    is_active: tenant.isActive,
    created_at: tenant.createdAt,
    user_email: userEmail,
  };
}

export async function listTenants(): Promise<TenantRow[]> {
  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      isActive: tenants.isActive,
      createdAt: tenants.createdAt,
      updatedAt: tenants.updatedAt,
      userEmail: users.email,
    })
    .from(tenants)
    .leftJoin(
      users,
      and(eq(users.tenantId, tenants.id), eq(users.role, 'professional'))
    )
    .orderBy(asc(tenants.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    is_active: r.isActive,
    created_at: r.createdAt,
    user_email: r.userEmail ?? undefined,
  }));
}

export async function getTenantById(id: string): Promise<TenantRow | null> {
  const [row] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      isActive: tenants.isActive,
      createdAt: tenants.createdAt,
      updatedAt: tenants.updatedAt,
      userEmail: users.email,
    })
    .from(tenants)
    .leftJoin(
      users,
      and(eq(users.tenantId, tenants.id), eq(users.role, 'professional'))
    )
    .where(eq(tenants.id, id))
    .limit(1);

  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    is_active: row.isActive,
    created_at: row.createdAt,
    user_email: row.userEmail ?? undefined,
  };
}

export async function createTenant(
  input: CreateTenantInput
): Promise<TenantRow> {
  const slug =
    (input.slug && input.slug.trim()) ||
    slugify(input.name) ||
    `tenant-${uuidv4().slice(0, 8)}`;

  const emailLower = input.email.toLowerCase();

  return await db.transaction(async (tx) => {
    const [tenant] = await tx
      .insert(tenants)
      .values({
        id: uuidv4(),
        name: input.name,
        slug,
        isActive: true,
      })
      .returning();

    const existing = await tx
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${emailLower}`)
      .limit(1);

    if (existing.length > 0) {
      const err = new Error('Email already in use');
      (err as Error & { statusCode?: number }).statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    await tx.insert(users).values({
      tenantId: tenant.id,
      email: emailLower,
      passwordHash,
      fullName: input.fullName ?? null,
      role: 'professional',
    });

    return toRow(tenant, emailLower);
  });
}

export async function updateTenant(
  id: string,
  updates: { name?: string; slug?: string; is_active?: boolean }
): Promise<TenantRow | null> {
  const setValue: Partial<typeof tenants.$inferInsert> = {};
  if (updates.name !== undefined) setValue.name = updates.name;
  if (updates.slug !== undefined) setValue.slug = updates.slug;
  if (updates.is_active !== undefined) setValue.isActive = updates.is_active;
  setValue.updatedAt = new Date();

  if (Object.keys(setValue).length <= 1) {
    return getTenantById(id);
  }

  const [updated] = await db
    .update(tenants)
    .set(setValue)
    .where(eq(tenants.id, id))
    .returning();

  if (!updated) return null;

  const [professional] = await db
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.tenantId, id), eq(users.role, 'professional')))
    .limit(1);

  return toRow(updated, professional?.email ?? undefined);
}

export async function deactivateTenant(id: string): Promise<boolean> {
  const result = await db
    .update(tenants)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(tenants.id, id));

  return (result.rowCount ?? 0) > 0;
}
