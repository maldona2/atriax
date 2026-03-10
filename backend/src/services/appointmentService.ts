import { and, asc, eq, sql } from 'drizzle-orm';
import { db, appointments, patients, sessions } from '../db/client.js';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export interface AppointmentRow {
  id: string;
  tenant_id: string;
  patient_id: string;
  scheduled_at: Date | null;
  duration_minutes: number | null;
  status: AppointmentStatus;
  notes: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  patient_first_name?: string;
  patient_last_name?: string;
}

export interface AppointmentDetail extends AppointmentRow {
  procedures_performed?: string | null;
  recommendations?: string | null;
}

export interface CreateAppointmentInput {
  patient_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  notes?: string | null;
}

export interface ListFilters {
  date?: string;
  status?: AppointmentStatus;
  patientId?: string;
}

function toRow(
  a: typeof appointments.$inferSelect,
  extras?: {
    firstName?: string | null;
    lastName?: string | null;
    proceduresPerformed?: string | null;
    recommendations?: string | null;
  }
): AppointmentRow {
  return {
    id: a.id,
    tenant_id: a.tenantId,
    patient_id: a.patientId,
    scheduled_at: a.scheduledAt,
    duration_minutes: a.durationMinutes ?? null,
    status: a.status as AppointmentStatus,
    notes: a.notes ?? null,
    created_at: a.createdAt ?? null,
    updated_at: a.updatedAt ?? null,
    patient_first_name: extras?.firstName ?? undefined,
    patient_last_name: extras?.lastName ?? undefined,
  };
}

export async function list(
  tenantId: string,
  filters: ListFilters
): Promise<AppointmentRow[]> {
  const conditions = [eq(appointments.tenantId, tenantId)];

  if (filters.date) {
    conditions.push(
      sql`${appointments.scheduledAt}::date = ${filters.date}::date`
    );
  }
  if (filters.status) {
    conditions.push(eq(appointments.status, filters.status));
  }
  if (filters.patientId) {
    conditions.push(eq(appointments.patientId, filters.patientId));
  }

  const rows = await db
    .select({
      id: appointments.id,
      tenantId: appointments.tenantId,
      patientId: appointments.patientId,
      scheduledAt: appointments.scheduledAt,
      durationMinutes: appointments.durationMinutes,
      status: appointments.status,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      firstName: patients.firstName,
      lastName: patients.lastName,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(and(...conditions))
    .orderBy(asc(appointments.scheduledAt));

  return rows.map((r) =>
    toRow(
      {
        id: r.id,
        tenantId: r.tenantId,
        patientId: r.patientId,
        scheduledAt: r.scheduledAt,
        durationMinutes: r.durationMinutes,
        status: r.status,
        notes: r.notes,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      },
      { firstName: r.firstName, lastName: r.lastName }
    )
  );
}

export async function getById(
  tenantId: string,
  id: string
): Promise<AppointmentDetail | null> {
  const [row] = await db
    .select({
      id: appointments.id,
      tenantId: appointments.tenantId,
      patientId: appointments.patientId,
      scheduledAt: appointments.scheduledAt,
      durationMinutes: appointments.durationMinutes,
      status: appointments.status,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      firstName: patients.firstName,
      lastName: patients.lastName,
      proceduresPerformed: sessions.proceduresPerformed,
      recommendations: sessions.recommendations,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .leftJoin(sessions, eq(sessions.appointmentId, appointments.id))
    .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
    .limit(1);

  if (!row) return null;

  return {
    ...toRow(
      {
        id: row.id,
        tenantId: row.tenantId,
        patientId: row.patientId,
        scheduledAt: row.scheduledAt,
        durationMinutes: row.durationMinutes,
        status: row.status,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      { firstName: row.firstName, lastName: row.lastName }
    ),
    procedures_performed: row.proceduresPerformed ?? null,
    recommendations: row.recommendations ?? null,
  };
}

export async function create(
  tenantId: string,
  input: CreateAppointmentInput
): Promise<AppointmentRow> {
  const [row] = await db
    .insert(appointments)
    .values({
      tenantId,
      patientId: input.patient_id,
      scheduledAt: new Date(input.scheduled_at),
      durationMinutes: input.duration_minutes ?? 60,
      status: 'pending',
      notes: input.notes ?? null,
    })
    .returning();

  return toRow(row);
}

export async function update(
  tenantId: string,
  id: string,
  data: Partial<CreateAppointmentInput> & { status?: AppointmentStatus }
): Promise<AppointmentRow | null> {
  const setValue: Partial<typeof appointments.$inferInsert> = {};

  if (data.patient_id !== undefined) setValue.patientId = data.patient_id;
  if (data.scheduled_at !== undefined)
    setValue.scheduledAt = new Date(data.scheduled_at);
  if (data.duration_minutes !== undefined)
    setValue.durationMinutes = data.duration_minutes ?? 60;
  if (data.status !== undefined) setValue.status = data.status;
  if (data.notes !== undefined) setValue.notes = data.notes ?? null;

  if (Object.keys(setValue).length === 0) {
    return getById(tenantId, id);
  }

  setValue.updatedAt = new Date();

  const [row] = await db
    .update(appointments)
    .set(setValue)
    .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
    .returning();

  return row ? toRow(row) : null;
}

export async function cancel(
  tenantId: string,
  id: string
): Promise<AppointmentRow | null> {
  const [row] = await db
    .update(appointments)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
    .returning();

  return row ? toRow(row) : null;
}
