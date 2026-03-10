import { and, eq } from 'drizzle-orm';
import { db, sessions } from '../db/client.js';

export interface SessionRow {
  id: string;
  tenant_id: string;
  appointment_id: string;
  patient_id: string;
  procedures_performed: string;
  recommendations: string | null;
  next_visit_notes: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface CreateSessionInput {
  appointment_id: string;
  patient_id: string;
  procedures_performed: string;
  recommendations?: string | null;
  next_visit_notes?: string | null;
}

function toRow(s: typeof sessions.$inferSelect): SessionRow {
  return {
    id: s.id,
    tenant_id: s.tenantId,
    appointment_id: s.appointmentId,
    patient_id: s.patientId,
    procedures_performed: s.proceduresPerformed,
    recommendations: s.recommendations ?? null,
    next_visit_notes: s.nextVisitNotes ?? null,
    created_at: s.createdAt ?? null,
    updated_at: s.updatedAt ?? null,
  };
}

export async function create(
  tenantId: string,
  input: CreateSessionInput
): Promise<SessionRow> {
  const [row] = await db
    .insert(sessions)
    .values({
      tenantId,
      appointmentId: input.appointment_id,
      patientId: input.patient_id,
      proceduresPerformed: input.procedures_performed,
      recommendations: input.recommendations ?? null,
      nextVisitNotes: input.next_visit_notes ?? null,
    })
    .returning();

  return toRow(row);
}

export async function getById(
  tenantId: string,
  id: string
): Promise<SessionRow | null> {
  const [row] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.tenantId, tenantId)))
    .limit(1);

  return row ? toRow(row) : null;
}

export async function getByAppointmentId(
  tenantId: string,
  appointmentId: string
): Promise<SessionRow | null> {
  const [row] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.appointmentId, appointmentId),
        eq(sessions.tenantId, tenantId)
      )
    )
    .limit(1);

  return row ? toRow(row) : null;
}

export async function update(
  tenantId: string,
  id: string,
  input: Partial<CreateSessionInput>
): Promise<SessionRow | null> {
  const setValue: Partial<typeof sessions.$inferInsert> = {};

  if (input.procedures_performed !== undefined)
    setValue.proceduresPerformed = input.procedures_performed;
  if (input.recommendations !== undefined)
    setValue.recommendations = input.recommendations ?? null;
  if (input.next_visit_notes !== undefined)
    setValue.nextVisitNotes = input.next_visit_notes ?? null;

  if (Object.keys(setValue).length === 0) {
    return getById(tenantId, id);
  }

  setValue.updatedAt = new Date();

  const [row] = await db
    .update(sessions)
    .set(setValue)
    .where(and(eq(sessions.id, id), eq(sessions.tenantId, tenantId)))
    .returning();

  return row ? toRow(row) : null;
}
