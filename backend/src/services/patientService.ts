import { and, asc, desc, eq, ilike, or } from 'drizzle-orm';
import { db, patients, appointments, sessions } from '../db/client.js';

export interface PatientRow {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  notes: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface AppointmentWithSession {
  id: string;
  scheduled_at: Date | null;
  status: string;
  procedures_performed?: string | null;
  recommendations?: string | null;
}

export interface CreatePatientInput {
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
  notes?: string | null;
}

function toRow(p: typeof patients.$inferSelect): PatientRow {
  return {
    id: p.id,
    tenant_id: p.tenantId,
    first_name: p.firstName,
    last_name: p.lastName,
    phone: p.phone ?? null,
    email: p.email ?? null,
    date_of_birth: p.dateOfBirth ?? null,
    notes: p.notes ?? null,
    created_at: p.createdAt ?? null,
    updated_at: p.updatedAt ?? null,
  };
}

export async function list(
  tenantId: string,
  q?: string
): Promise<PatientRow[]> {
  const where = q?.trim()
    ? and(
        eq(patients.tenantId, tenantId),
        or(
          ilike(patients.firstName, `%${q.trim()}%`),
          ilike(patients.lastName, `%${q.trim()}%`)
        )
      )
    : eq(patients.tenantId, tenantId);

  const rows = await db
    .select()
    .from(patients)
    .where(where)
    .orderBy(asc(patients.lastName), asc(patients.firstName));

  return rows.map(toRow);
}

export async function getById(
  tenantId: string,
  id: string
): Promise<{
  patient: PatientRow;
  appointments: AppointmentWithSession[];
} | null> {
  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.tenantId, tenantId)))
    .limit(1);

  if (!patient) return null;

  const apptRows = await db
    .select({
      id: appointments.id,
      scheduled_at: appointments.scheduledAt,
      status: appointments.status,
      procedures_performed: sessions.proceduresPerformed,
      recommendations: sessions.recommendations,
    })
    .from(appointments)
    .leftJoin(sessions, eq(sessions.appointmentId, appointments.id))
    .where(
      and(eq(appointments.patientId, id), eq(appointments.tenantId, tenantId))
    )
    .orderBy(desc(appointments.scheduledAt));

  return {
    patient: toRow(patient),
    appointments: apptRows.map((r) => ({
      id: r.id,
      scheduled_at: r.scheduled_at,
      status: r.status,
      procedures_performed: r.procedures_performed ?? null,
      recommendations: r.recommendations ?? null,
    })),
  };
}

export async function create(
  tenantId: string,
  input: CreatePatientInput
): Promise<PatientRow> {
  const [row] = await db
    .insert(patients)
    .values({
      tenantId,
      firstName: input.first_name,
      lastName: input.last_name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      dateOfBirth: input.date_of_birth ?? null,
      notes: input.notes ?? null,
    })
    .returning();

  return toRow(row);
}

export async function update(
  tenantId: string,
  id: string,
  input: Partial<CreatePatientInput>
): Promise<PatientRow | null> {
  const setValue: Partial<typeof patients.$inferInsert> = {};
  if (input.first_name !== undefined) setValue.firstName = input.first_name;
  if (input.last_name !== undefined) setValue.lastName = input.last_name;
  if (input.phone !== undefined) setValue.phone = input.phone ?? null;
  if (input.email !== undefined) setValue.email = input.email ?? null;
  if (input.date_of_birth !== undefined)
    setValue.dateOfBirth = input.date_of_birth ?? null;
  if (input.notes !== undefined) setValue.notes = input.notes ?? null;

  if (Object.keys(setValue).length === 0) {
    const result = await getById(tenantId, id);
    return result?.patient ?? null;
  }

  setValue.updatedAt = new Date();

  const [row] = await db
    .update(patients)
    .set(setValue)
    .where(and(eq(patients.id, id), eq(patients.tenantId, tenantId)))
    .returning();

  return row ? toRow(row) : null;
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  const result = await db
    .delete(patients)
    .where(and(eq(patients.id, id), eq(patients.tenantId, tenantId)));

  return (result.rowCount ?? 0) > 0;
}
