import { and, asc, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import { db, patients, appointments, sessions } from '../db/client.js';
import * as medicalHistoryService from './medicalHistoryService.js';

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
  /** Number of appointments for this patient */
  appointment_count?: number;
  /** Number of appointments with unpaid or partial payment */
  unpaid_count?: number;
  /** Sum of total_amount_cents for unpaid/partial appointments */
  unpaid_total_cents?: number;
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
    .select({
      id: patients.id,
      tenantId: patients.tenantId,
      firstName: patients.firstName,
      lastName: patients.lastName,
      phone: patients.phone,
      email: patients.email,
      dateOfBirth: patients.dateOfBirth,
      notes: patients.notes,
      createdAt: patients.createdAt,
      updatedAt: patients.updatedAt,
      appointmentCount: sql<number>`count(${appointments.id})::int`.as(
        'appointment_count'
      ),
      unpaidCount:
        sql<number>`count(case when ${appointments.paymentStatus} in ('unpaid','partial') then 1 end)::int`.as(
          'unpaid_count'
        ),
      unpaidTotalCents:
        sql<number>`coalesce(sum(case when ${appointments.paymentStatus} in ('unpaid','partial') then coalesce(${appointments.totalAmountCents}, 0) else 0 end), 0)::int`.as(
          'unpaid_total_cents'
        ),
    })
    .from(patients)
    .leftJoin(
      appointments,
      and(
        eq(appointments.patientId, patients.id),
        eq(appointments.tenantId, patients.tenantId)
      )
    )
    .where(where)
    .groupBy(patients.id)
    .orderBy(asc(patients.lastName), asc(patients.firstName));

  return rows.map((r) => ({
    ...toRow(r as typeof patients.$inferSelect),
    appointment_count: r.appointmentCount,
    unpaid_count: r.unpaidCount,
    unpaid_total_cents: r.unpaidTotalCents,
  }));
}

export async function getById(
  tenantId: string,
  id: string
): Promise<{
  patient: PatientRow;
  appointments: AppointmentWithSession[];
  medical_history: {
    conditions: medicalHistoryService.MedicalConditionRow[];
    medications: medicalHistoryService.MedicationRow[];
    allergies: medicalHistoryService.AllergyRow[];
  };
} | null> {
  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.tenantId, tenantId)))
    .limit(1);

  if (!patient) return null;

  // Fetch appointments and medical history in parallel
  const [apptRows, conditions, medications, allergies] = await Promise.all([
    db
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
      .orderBy(desc(appointments.scheduledAt)),
    medicalHistoryService.listConditions(tenantId, id),
    medicalHistoryService.listMedications(tenantId, id),
    medicalHistoryService.listAllergies(tenantId, id),
  ]);

  return {
    patient: toRow(patient),
    appointments: apptRows.map((r) => ({
      id: r.id,
      scheduled_at: r.scheduled_at,
      status: r.status,
      procedures_performed: r.procedures_performed ?? null,
      recommendations: r.recommendations ?? null,
    })),
    medical_history: {
      conditions,
      medications,
      allergies,
    },
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

export interface PatientSessionRow {
  id: string;
  appointment_id: string;
  scheduled_at: Date | null;
  procedures_performed: string;
  recommendations: string | null;
  created_at: Date | null;
}

export async function getPatientSessions(
  tenantId: string,
  patientId: string,
  excludeSessionId?: string
): Promise<PatientSessionRow[]> {
  // Validate patient belongs to tenant
  const [patient] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.tenantId, tenantId)))
    .limit(1);

  if (!patient) return [];

  const conditions = [
    eq(sessions.patientId, patientId),
    eq(sessions.tenantId, tenantId),
  ];
  if (excludeSessionId) {
    conditions.push(ne(sessions.id, excludeSessionId));
  }

  const rows = await db
    .select({
      id: sessions.id,
      appointmentId: sessions.appointmentId,
      scheduledAt: appointments.scheduledAt,
      proceduresPerformed: sessions.proceduresPerformed,
      recommendations: sessions.recommendations,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .innerJoin(appointments, eq(appointments.id, sessions.appointmentId))
    .where(and(...conditions))
    .orderBy(desc(sessions.createdAt));

  return rows.map((r) => ({
    id: r.id,
    appointment_id: r.appointmentId,
    scheduled_at: r.scheduledAt,
    procedures_performed: r.proceduresPerformed,
    recommendations: r.recommendations ?? null,
    created_at: r.createdAt ?? null,
  }));
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  const result = await db
    .delete(patients)
    .where(and(eq(patients.id, id), eq(patients.tenantId, tenantId)));

  return (result.rowCount ?? 0) > 0;
}
