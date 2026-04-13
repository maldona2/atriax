import { and, eq } from 'drizzle-orm';
import { db, treatments } from '../db/client.js';

export interface TreatmentRow {
  id: string;
  tenant_id: string;
  name: string;
  price_cents: number;
  cost_cents: number | null;
  initial_frequency_weeks: number | null;
  initial_sessions_count: number | null;
  maintenance_frequency_weeks: number | null;
  protocol_notes: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface CreateTreatmentInput {
  name: string;
  price_cents: number;
  cost_cents?: number | null;
  initial_frequency_weeks?: number | null;
  initial_sessions_count?: number | null;
  maintenance_frequency_weeks?: number | null;
  protocol_notes?: string | null;
}

export interface UpdateTreatmentInput extends Partial<CreateTreatmentInput> {}

function toRow(t: typeof treatments.$inferSelect): TreatmentRow {
  return {
    id: t.id,
    tenant_id: t.tenantId,
    name: t.name,
    price_cents: t.priceCents,
    cost_cents: t.costCents ?? null,
    initial_frequency_weeks: t.initialFrequencyWeeks,
    initial_sessions_count: t.initialSessionsCount,
    maintenance_frequency_weeks: t.maintenanceFrequencyWeeks,
    protocol_notes: t.protocolNotes,
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

export async function getById(
  tenantId: string,
  id: string
): Promise<TreatmentRow | null> {
  const [row] = await db
    .select()
    .from(treatments)
    .where(and(eq(treatments.id, id), eq(treatments.tenantId, tenantId)));
  return row ? toRow(row) : null;
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
      costCents: data.cost_cents ?? null,
      initialFrequencyWeeks: data.initial_frequency_weeks ?? null,
      initialSessionsCount: data.initial_sessions_count ?? null,
      maintenanceFrequencyWeeks: data.maintenance_frequency_weeks ?? null,
      protocolNotes: data.protocol_notes ?? null,
      updatedAt: new Date(),
    })
    .returning();
  if (!row) throw new Error('Failed to create treatment');
  return toRow(row);
}

export async function update(
  tenantId: string,
  id: string,
  data: UpdateTreatmentInput
): Promise<TreatmentRow | null> {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.price_cents !== undefined) updates.priceCents = data.price_cents;
  if (data.cost_cents !== undefined) updates.costCents = data.cost_cents;
  if (data.initial_frequency_weeks !== undefined)
    updates.initialFrequencyWeeks = data.initial_frequency_weeks;
  if (data.initial_sessions_count !== undefined)
    updates.initialSessionsCount = data.initial_sessions_count;
  if (data.maintenance_frequency_weeks !== undefined)
    updates.maintenanceFrequencyWeeks = data.maintenance_frequency_weeks;
  if (data.protocol_notes !== undefined)
    updates.protocolNotes = data.protocol_notes;

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
