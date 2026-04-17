import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';
import {
  db,
  appointments,
  patients,
  sessions,
  appointmentTreatments,
  treatments,
  users,
} from '../db/client.js';
import {
  sendAppointmentBooked,
  sendAppointmentConfirmed,
  sendAppointmentCancelled,
} from './mailService.js';
import { whatsAppNotificationService } from '../whatsapp/services/WhatsAppNotificationService.js';
import {
  createCancellationToken,
  buildCancelUrl,
} from './cancellationTokenService.js';
import { syncQueue } from './syncQueue.js';
import { googleAuthService } from './googleAuthService.js';
import * as patientTreatmentService from './patientTreatmentService.js';

async function enqueueSyncIfConnected(
  tenantId: string,
  operation: 'create' | 'update' | 'delete',
  appointmentId: string
): Promise<void> {
  const [professional] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.tenantId, tenantId))
    .limit(1);

  if (!professional) {
    console.log('[Calendar Sync] No professional found for tenant:', tenantId);
    return;
  }

  const connected = await googleAuthService.isConnected(professional.id);
  if (!connected) {
    console.log(
      '[Calendar Sync] Doctor not connected to Google Calendar, skipping sync for appointment:',
      appointmentId
    );
    return;
  }

  console.log(
    '[Calendar Sync] Enqueueing sync operation:',
    operation,
    'for appointment:',
    appointmentId
  );
  await syncQueue.enqueue({
    tenantId,
    userId: professional.id,
    appointmentId,
    operation,
    priority: 1,
  });
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no-show';

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
  payment_status: PaymentStatus | null;
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
  session_id?: string | null;
  treatments?: AppointmentTreatmentRow[];
}

export interface CreateAppointmentInput {
  patient_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  notes?: string | null;
  payment_status?: PaymentStatus;
  treatments?: TreatmentLineItem[];
  userRole?: string;
}

export interface ListFilters {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
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
    payment_status: (a.paymentStatus as PaymentStatus | null) ?? null,
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
  if (filters.dateFrom) {
    conditions.push(
      sql`${appointments.scheduledAt}::date >= ${filters.dateFrom}::date`
    );
  }
  if (filters.dateTo) {
    conditions.push(
      sql`${appointments.scheduledAt}::date <= ${filters.dateTo}::date`
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
      sessionId: sessions.id,
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
    session_id: row.sessionId ?? null,
    treatments: treatmentItems,
  };
}

export interface PreviousSession {
  id: string;
  appointment_id: string;
  scheduled_at: Date | null;
  procedures_performed: string;
  recommendations: string | null;
  created_at: Date | null;
}

export interface AppointmentDetailExtended extends AppointmentDetail {
  patient_phone: string | null;
  patient_email: string | null;
  patient_date_of_birth: string | null;
  patient_notes: string | null;
  previous_sessions?: PreviousSession[];
}

export async function getDetailById(
  tenantId: string,
  id: string
): Promise<AppointmentDetailExtended | null> {
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
      patientPhone: patients.phone,
      patientEmail: patients.email,
      patientDateOfBirth: patients.dateOfBirth,
      patientNotes: patients.notes,
      proceduresPerformed: sessions.proceduresPerformed,
      recommendations: sessions.recommendations,
      sessionId: sessions.id,
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

  // Fetch previous sessions for this patient (last 5, excluding current appointment's session)
  const prevSessionConditions = [
    eq(sessions.patientId, row.patientId),
    eq(sessions.tenantId, tenantId),
  ];
  if (row.sessionId) {
    prevSessionConditions.push(ne(sessions.id, row.sessionId));
  }

  const prevSessionRows = await db
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
    .where(and(...prevSessionConditions))
    .orderBy(desc(sessions.createdAt))
    .limit(5);

  const previousSessions: PreviousSession[] = prevSessionRows.map((s) => ({
    id: s.id,
    appointment_id: s.appointmentId,
    scheduled_at: s.scheduledAt,
    procedures_performed: s.proceduresPerformed,
    recommendations: s.recommendations ?? null,
    created_at: s.createdAt ?? null,
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
    session_id: row.sessionId ?? null,
    treatments: treatmentItems,
    patient_phone: row.patientPhone ?? null,
    patient_email: row.patientEmail ?? null,
    patient_date_of_birth: row.patientDateOfBirth ?? null,
    patient_notes: row.patientNotes ?? null,
    previous_sessions: previousSessions,
  };
}

async function getEmailContext(
  tenantId: string,
  patientId: string,
  scheduledAt: Date | null,
  durationMinutes: number | null
) {
  const [patient] = await db
    .select({
      email: patients.email,
      phone: patients.phone,
      firstName: patients.firstName,
      lastName: patients.lastName,
    })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  const [professional] = await db
    .select({ fullName: users.fullName, address: users.address })
    .from(users)
    .where(eq(users.tenantId, tenantId))
    .limit(1);

  return {
    patientEmail: patient?.email ?? null,
    patientPhone: patient?.phone ?? null,
    patientName: patient
      ? `${patient.firstName} ${patient.lastName}`
      : 'Paciente',
    professionalName: professional?.fullName ?? 'El profesional',
    address: professional?.address ?? null,
    scheduledAt: scheduledAt ?? new Date(),
    durationMinutes: durationMinutes ?? 60,
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

  const initialStatus: AppointmentStatus =
    input.userRole === 'professional' ? 'confirmed' : 'pending';

  const [row] = await db
    .insert(appointments)
    .values({
      tenantId,
      patientId: input.patient_id,
      scheduledAt: new Date(input.scheduled_at),
      durationMinutes: input.duration_minutes ?? 60,
      status: initialStatus,
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

    // Auto-create or update PatientTreatment protocol records so the
    // suggested-date feature has data to work with.
    const existingPTs = await patientTreatmentService.listByPatient(
      tenantId,
      input.patient_id
    );
    for (const lineItem of input.treatments) {
      const activePT = existingPTs.find(
        (pt) => pt.treatment_id === lineItem.treatment_id && pt.is_active
      );
      if (activePT) {
        await patientTreatmentService.updateProgress(tenantId, activePT.id, {
          last_appointment_id: row.id,
        });
      } else {
        await patientTreatmentService.create(tenantId, {
          patient_id: input.patient_id,
          treatment_id: lineItem.treatment_id,
          last_appointment_id: row.id,
        });
      }
    }
  }

  const result = toRow(row);

  // fire-and-forget notifications
  void getEmailContext(
    tenantId,
    input.patient_id,
    row.scheduledAt,
    row.durationMinutes
  ).then(async (ctx) => {
    const notificationData = {
      patientName: ctx.patientName,
      professionalName: ctx.professionalName,
      scheduledAt: ctx.scheduledAt,
      durationMinutes: ctx.durationMinutes,
      address: ctx.address,
      notes: input.notes ?? null,
    };
    if (ctx.patientEmail) {
      sendAppointmentBooked(ctx.patientEmail, notificationData, row.id);
    }
    if (ctx.patientPhone) {
      try {
        const token = await createCancellationToken(row.id, tenantId);
        const cancelUrl = buildCancelUrl(token);
        void whatsAppNotificationService.sendAppointmentBooked(
          ctx.patientPhone,
          { ...notificationData, cancelUrl }
        );
      } catch {
        // Token generation failed — fall back to template without cancel link
        void whatsAppNotificationService.sendAppointmentBooked(
          ctx.patientPhone,
          notificationData
        );
      }
    }
  });

  // fire-and-forget calendar sync for auto-confirmed appointments
  if (initialStatus === 'confirmed') {
    void enqueueSyncIfConnected(tenantId, 'create', row.id);
  }

  return result;
}

export type UpdateAppointmentInput = Partial<CreateAppointmentInput> & {
  status?: AppointmentStatus;
  payment_status?: PaymentStatus;
  treatments?: TreatmentLineItem[];
};

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled', 'no-show'],
  confirmed: ['completed', 'cancelled', 'no-show'],
  completed: ['cancelled'],
  cancelled: [],
  'no-show': [],
};

export async function update(
  tenantId: string,
  id: string,
  data: UpdateAppointmentInput
): Promise<AppointmentRow | null> {
  const setValue: Partial<typeof appointments.$inferInsert> = {};

  if (data.status !== undefined) {
    const [current] = await db
      .select({ status: appointments.status })
      .from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
      .limit(1);

    if (!current) return null;

    const currentStatus = current.status as AppointmentStatus;
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(data.status)) {
      const err = new Error(
        `Cannot transition from '${currentStatus}' to '${data.status}'`
      );
      (err as Error & { statusCode?: number }).statusCode = 400;
      throw err;
    }
  }

  if (data.patient_id !== undefined) setValue.patientId = data.patient_id;
  if (data.scheduled_at !== undefined)
    setValue.scheduledAt = new Date(data.scheduled_at);
  if (data.duration_minutes !== undefined)
    setValue.durationMinutes = data.duration_minutes ?? 60;
  if (data.status !== undefined) setValue.status = data.status;
  if (data.status === 'cancelled') {
    setValue.paymentStatus = null;
    setValue.totalAmountCents = null;
  } else if (data.payment_status !== undefined) {
    setValue.paymentStatus = data.payment_status;
  }
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

  if (!row) return null;

  // fire-and-forget notifications on status changes that patients care about
  if (data.status === 'confirmed' || data.status === 'cancelled') {
    void getEmailContext(
      tenantId,
      row.patientId,
      row.scheduledAt,
      row.durationMinutes
    ).then((ctx) => {
      const notificationData = {
        patientName: ctx.patientName,
        professionalName: ctx.professionalName,
        scheduledAt: ctx.scheduledAt,
        durationMinutes: ctx.durationMinutes,
        address: ctx.address,
      };
      if (ctx.patientEmail) {
        if (data.status === 'confirmed') {
          sendAppointmentConfirmed(ctx.patientEmail, notificationData, row.id);
        } else {
          sendAppointmentCancelled(ctx.patientEmail, notificationData, row.id);
        }
      }
      if (ctx.patientPhone) {
        if (data.status === 'confirmed') {
          void whatsAppNotificationService.sendAppointmentConfirmed(
            ctx.patientPhone,
            notificationData
          );
        } else {
          void whatsAppNotificationService.sendAppointmentCancelled(
            ctx.patientPhone,
            notificationData
          );
        }
      }
    });
  }

  // fire-and-forget calendar sync
  if (data.status === 'confirmed') {
    void enqueueSyncIfConnected(tenantId, 'create', row.id);
  } else if (data.status === 'cancelled') {
    void enqueueSyncIfConnected(tenantId, 'delete', row.id);
  } else if (data.status === undefined) {
    void enqueueSyncIfConnected(tenantId, 'update', row.id);
  }

  return toRow(row);
}

export async function cancel(
  tenantId: string,
  id: string
): Promise<AppointmentRow | null> {
  const [row] = await db
    .update(appointments)
    .set({
      status: 'cancelled',
      paymentStatus: null,
      totalAmountCents: null,
      updatedAt: new Date(),
    })
    .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
    .returning();

  if (!row) return null;

  void getEmailContext(
    tenantId,
    row.patientId,
    row.scheduledAt,
    row.durationMinutes
  ).then((ctx) => {
    const notificationData = {
      patientName: ctx.patientName,
      professionalName: ctx.professionalName,
      scheduledAt: ctx.scheduledAt,
      durationMinutes: ctx.durationMinutes,
    };
    if (ctx.patientEmail) {
      sendAppointmentCancelled(ctx.patientEmail, notificationData, row.id);
    }
    if (ctx.patientPhone) {
      void whatsAppNotificationService.sendAppointmentCancelled(
        ctx.patientPhone,
        notificationData
      );
    }
  });

  void enqueueSyncIfConnected(tenantId, 'delete', row.id);

  return toRow(row);
}
