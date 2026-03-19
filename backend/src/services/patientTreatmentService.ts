import { and, eq } from 'drizzle-orm';
import {
  db,
  patientTreatments,
  treatments,
  appointments,
} from '../db/client.js';
import * as treatmentService from './treatmentService.js';

export interface PatientTreatmentRow {
  id: string;
  tenant_id: string;
  patient_id: string;
  treatment_id: string;
  current_session: number;
  started_at: Date | null;
  last_appointment_id: string | null;
  is_active: boolean;
  completed_at: Date | null;
  created_at: Date | null;
  updated_at: Date | null;
  treatment?: treatmentService.TreatmentRow | null;
}

export interface CreatePatientTreatmentInput {
  patient_id: string;
  treatment_id: string;
  current_session?: number;
}

export interface UpdatePatientTreatmentInput {
  current_session?: number;
  last_appointment_id?: string | null;
  is_active?: boolean;
}

function toRow(
  t: typeof patientTreatments.$inferSelect,
  treatment?: treatmentService.TreatmentRow | null
): PatientTreatmentRow {
  return {
    id: t.id,
    tenant_id: t.tenantId,
    patient_id: t.patientId,
    treatment_id: t.treatmentId,
    current_session: t.currentSession,
    started_at: t.startedAt,
    last_appointment_id: t.lastAppointmentId,
    is_active: t.isActive,
    completed_at: t.completedAt ?? null,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    treatment,
  };
}

export async function listByPatient(
  tenantId: string,
  patientId: string
): Promise<PatientTreatmentRow[]> {
  const rows = await db
    .select()
    .from(patientTreatments)
    .where(
      and(
        eq(patientTreatments.tenantId, tenantId),
        eq(patientTreatments.patientId, patientId)
      )
    );

  const result: PatientTreatmentRow[] = [];
  for (const row of rows) {
    const treatment = await treatmentService.getById(tenantId, row.treatmentId);
    result.push(toRow(row, treatment));
  }
  return result;
}

export async function listActiveByPatient(
  tenantId: string,
  patientId: string
): Promise<PatientTreatmentRow[]> {
  const rows = await db
    .select()
    .from(patientTreatments)
    .where(
      and(
        eq(patientTreatments.tenantId, tenantId),
        eq(patientTreatments.patientId, patientId),
        eq(patientTreatments.isActive, true)
      )
    );

  const result: PatientTreatmentRow[] = [];
  for (const row of rows) {
    const treatment = await treatmentService.getById(tenantId, row.treatmentId);
    result.push(toRow(row, treatment));
  }
  return result;
}

export async function create(
  tenantId: string,
  data: CreatePatientTreatmentInput
): Promise<PatientTreatmentRow> {
  const [row] = await db
    .insert(patientTreatments)
    .values({
      tenantId,
      patientId: data.patient_id,
      treatmentId: data.treatment_id,
      currentSession: data.current_session ?? 1,
      updatedAt: new Date(),
    })
    .returning();
  if (!row) throw new Error('Failed to assign treatment to patient');

  const treatment = await treatmentService.getById(tenantId, row.treatmentId);
  return toRow(row, treatment);
}

export async function updateProgress(
  tenantId: string,
  id: string,
  data: UpdatePatientTreatmentInput
): Promise<PatientTreatmentRow | null> {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.current_session !== undefined)
    updates.currentSession = data.current_session;
  if (data.last_appointment_id !== undefined)
    updates.lastAppointmentId = data.last_appointment_id;
  if (data.is_active !== undefined) updates.isActive = data.is_active;

  const [row] = await db
    .update(patientTreatments)
    .set(updates as Partial<typeof patientTreatments.$inferInsert>)
    .where(
      and(
        eq(patientTreatments.id, id),
        eq(patientTreatments.tenantId, tenantId)
      )
    )
    .returning();

  if (!row) return null;
  const treatment = await treatmentService.getById(tenantId, row.treatmentId);
  return toRow(row, treatment);
}

export async function completeSession(
  tenantId: string,
  id: string,
  appointmentId: string | null
): Promise<PatientTreatmentRow | null> {
  const [row] = await db
    .select()
    .from(patientTreatments)
    .where(
      and(
        eq(patientTreatments.id, id),
        eq(patientTreatments.tenantId, tenantId)
      )
    );

  if (!row) return null;

  const treatment = await treatmentService.getById(tenantId, row.treatmentId);
  if (!treatment) return null;

  const nextSession = row.currentSession + 1;

  let isActive = row.isActive;
  let currentSession = nextSession;

  if (
    treatment.initial_sessions_count !== null &&
    treatment.initial_sessions_count > 0 &&
    nextSession > treatment.initial_sessions_count
  ) {
    isActive = treatment.maintenance_frequency_weeks === null;
  }

  const completedAt = !isActive && row.isActive ? new Date() : undefined;

  const [updated] = await db
    .update(patientTreatments)
    .set({
      currentSession,
      lastAppointmentId: appointmentId,
      isActive,
      ...(completedAt !== undefined ? { completedAt } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(patientTreatments.id, id),
        eq(patientTreatments.tenantId, tenantId)
      )
    )
    .returning();

  if (!updated) return null;
  return toRow(updated, treatment);
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  const [row] = await db
    .delete(patientTreatments)
    .where(
      and(
        eq(patientTreatments.id, id),
        eq(patientTreatments.tenantId, tenantId)
      )
    )
    .returning({ id: patientTreatments.id });
  return !!row;
}

export function calculateNextAppointment(
  treatment: treatmentService.TreatmentRow,
  patientTreatment: PatientTreatmentRow,
  lastAppointmentDate: Date | null
): Date | null {
  if (!lastAppointmentDate) return null;

  const initialPhaseComplete =
    treatment.initial_sessions_count !== null &&
    patientTreatment.current_session >= treatment.initial_sessions_count;

  let weeksToAdd: number | null = null;

  if (!initialPhaseComplete && treatment.initial_frequency_weeks !== null) {
    weeksToAdd = treatment.initial_frequency_weeks;
  } else if (
    initialPhaseComplete &&
    treatment.maintenance_frequency_weeks !== null
  ) {
    weeksToAdd = treatment.maintenance_frequency_weeks;
  }

  if (weeksToAdd === null) return null;

  const nextDate = new Date(lastAppointmentDate);
  nextDate.setDate(nextDate.getDate() + weeksToAdd * 7);
  return nextDate;
}
