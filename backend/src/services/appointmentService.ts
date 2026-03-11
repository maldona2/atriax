import { and, asc, eq, sql } from 'drizzle-orm';
import {
  db,
  appointments,
  patients,
  sessions,
  appointmentTreatments,
  treatments,
} from '../db/client.js';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'partial' | 'refunded';

export interface TreatmentLineItem {
  treatment_id: string;
  quantity: number;
  unit_price_cents: number;
}

export interface AppointmentTreatmentRow {
  id: string;
  treatment_id: string;
  treatment_name: string;
  quantity: number;
  unit_price_cents: number;
}

export interface AppointmentRow {
  id: string;
  tenant_id: string;
  patient_id: string;
  scheduled_at: Date | null;
  duration_minutes: number | null;
  status: AppointmentStatus;
  payment_status: PaymentStatus;
  total_amount_cents: number | null;
  notes: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  patient_first_name?: string;
  patient_last_name?: string;
}

export interface AppointmentDetail extends AppointmentRow {
  procedures_performed?: string | null;
  recommendations?: string | null;
  treatments?: AppointmentTreatmentRow[];
}

export interface CreateAppointmentInput {
  patient_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  notes?: string | null;
  payment_status?: PaymentStatus;
  treatments?: TreatmentLineItem[];
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
    payment_status: (a.paymentStatus as PaymentStatus) ?? 'unpaid',
    total_amount_cents: a.totalAmountCents ?? null,
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
      paymentStatus: appointments.paymentStatus,
      totalAmountCents: appointments.totalAmountCents,
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
        paymentStatus: r.paymentStatus,
        totalAmountCents: r.totalAmountCents,
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
      paymentStatus: appointments.paymentStatus,
      totalAmountCents: appointments.totalAmountCents,
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

  const treatmentRows = await db
    .select({
      id: appointmentTreatments.id,
      treatmentId: appointmentTreatments.treatmentId,
      treatmentName: treatments.name,
      quantity: appointmentTreatments.quantity,
      unitPriceCents: appointmentTreatments.unitPriceCents,
    })
    .from(appointmentTreatments)
    .innerJoin(treatments, eq(treatments.id, appointmentTreatments.treatmentId))
    .where(eq(appointmentTreatments.appointmentId, id));

  const treatmentItems: AppointmentTreatmentRow[] = treatmentRows.map((t) => ({
    id: t.id,
    treatment_id: t.treatmentId,
    treatment_name: t.treatmentName,
    quantity: t.quantity,
    unit_price_cents: t.unitPriceCents,
  }));

  return {
    ...toRow(
      {
        id: row.id,
        tenantId: row.tenantId,
        patientId: row.patientId,
        scheduledAt: row.scheduledAt,
        durationMinutes: row.durationMinutes,
        status: row.status,
        paymentStatus: row.paymentStatus,
        totalAmountCents: row.totalAmountCents,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      { firstName: row.firstName, lastName: row.lastName }
    ),
    procedures_performed: row.proceduresPerformed ?? null,
    recommendations: row.recommendations ?? null,
    treatments: treatmentItems,
  };
}

function computeTotalCents(items: TreatmentLineItem[]): number {
  return items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_cents,
    0
  );
}

export async function create(
  tenantId: string,
  input: CreateAppointmentInput
): Promise<AppointmentRow> {
  const totalCents =
    input.treatments && input.treatments.length > 0
      ? computeTotalCents(input.treatments)
      : null;

  const [row] = await db
    .insert(appointments)
    .values({
      tenantId,
      patientId: input.patient_id,
      scheduledAt: new Date(input.scheduled_at),
      durationMinutes: input.duration_minutes ?? 60,
      status: 'pending',
      paymentStatus: input.payment_status ?? 'unpaid',
      totalAmountCents: totalCents,
      notes: input.notes ?? null,
    })
    .returning();

  if (!row) throw new Error('Failed to create appointment');

  if (input.treatments && input.treatments.length > 0) {
    await db.insert(appointmentTreatments).values(
      input.treatments.map((t) => ({
        appointmentId: row.id,
        treatmentId: t.treatment_id,
        quantity: t.quantity,
        unitPriceCents: t.unit_price_cents,
      }))
    );
  }

  return toRow(row);
}

export type UpdateAppointmentInput = Partial<CreateAppointmentInput> & {
  status?: AppointmentStatus;
  payment_status?: PaymentStatus;
  treatments?: TreatmentLineItem[];
};

export async function update(
  tenantId: string,
  id: string,
  data: UpdateAppointmentInput
): Promise<AppointmentRow | null> {
  const setValue: Partial<typeof appointments.$inferInsert> = {};

  if (data.patient_id !== undefined) setValue.patientId = data.patient_id;
  if (data.scheduled_at !== undefined)
    setValue.scheduledAt = new Date(data.scheduled_at);
  if (data.duration_minutes !== undefined)
    setValue.durationMinutes = data.duration_minutes ?? 60;
  if (data.status !== undefined) setValue.status = data.status;
  if (data.payment_status !== undefined)
    setValue.paymentStatus = data.payment_status;
  if (data.notes !== undefined) setValue.notes = data.notes ?? null;

  if (data.treatments !== undefined) {
    await db
      .delete(appointmentTreatments)
      .where(eq(appointmentTreatments.appointmentId, id));

    if (data.treatments.length > 0) {
      setValue.totalAmountCents = computeTotalCents(data.treatments);
      await db.insert(appointmentTreatments).values(
        data.treatments.map((t) => ({
          appointmentId: id,
          treatmentId: t.treatment_id,
          quantity: t.quantity,
          unitPriceCents: t.unit_price_cents,
        }))
      );
    } else {
      setValue.totalAmountCents = null;
    }
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
