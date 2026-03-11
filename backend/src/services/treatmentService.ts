import { and, eq } from 'drizzle-orm';
import { db, treatments } from '../db/client.js';

export interface TreatmentRow {
  id: string;
  tenant_id: string;
  name: string;
  price_cents: number;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface CreateTreatmentInput {
  name: string;
  price_cents: number;
}

function toRow(t: typeof treatments.$inferSelect): TreatmentRow {
  return {
    id: t.id,
    tenant_id: t.tenantId,
    name: t.name,
    price_cents: t.priceCents,
    created_at: t.createdAt ?? null,
    updated_at: t.updatedAt ?? null,
  };
}

export async function list(tenantId: string): Promise<TreatmentRow[]> {
  const rows = await db
    .select()
    .from(treatments)
    .where(eq(treatments.tenantId, tenantId));
  return rows.map(toRow);
}

export async function create(
  tenantId: string,
  data: CreateTreatmentInput
): Promise<TreatmentRow> {
  const [row] = await db
    .insert(treatments)
    .values({
      tenantId,
      name: data.name,
      priceCents: data.price_cents,
      updatedAt: new Date(),
    })
    .returning();
  if (!row) throw new Error('Failed to create treatment');
  return toRow(row);
}

export async function update(
  tenantId: string,
  id: string,
  data: Partial<CreateTreatmentInput>
): Promise<TreatmentRow | null> {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.price_cents !== undefined) updates.priceCents = data.price_cents;

  const [row] = await db
    .update(treatments)
    .set(updates as Partial<typeof treatments.$inferInsert>)
    .where(eq(treatments.id, id))
    .returning();

  if (!row || row.tenantId !== tenantId) return null;
  return toRow(row);
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  const [row] = await db
    .delete(treatments)
    .where(and(eq(treatments.id, id), eq(treatments.tenantId, tenantId)))
    .returning({ id: treatments.id });
  return !!row;
}
