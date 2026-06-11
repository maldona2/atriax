import { and, eq, gte, ne } from 'drizzle-orm';
import {
  db,
  patientTreatments,
  treatments,
  patients,
  appointments,
} from '../db/client.js';
import { computeNextDueDate } from './patientTreatmentService.js';
import * as appointmentService from './appointmentService.js';
import type { AppointmentRow } from './appointmentService.js';
import { debtDashboardService } from './debtDashboardService.js';
import * as self from './dashboardService.js';

export interface CycleAlertRow {
  patientTreatmentId: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  treatmentName: string;
  currentSession: number;
  startedAt: Date | null;
  lastAppointmentScheduledAt: Date | null;
  lastCycleReminderAt: Date | null;
  initialSessionsCount: number | null;
  initialFrequencyWeeks: number | null;
  maintenanceFrequencyWeeks: number | null;
}

export interface CycleAlert {
  patientTreatmentId: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  treatmentName: string;
  nextDueDate: string; // ISO
  daysUntilDue: number; // negative when overdue
  lastCycleReminderAt: string | null;
}

export interface CycleAlerts {
  upcoming: CycleAlert[];
  overdue: CycleAlert[];
}

export interface ClassifyOptions {
  now: Date;
  windowDays: number;
  cooldownDays: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function classifyCycleAlerts(
  rows: CycleAlertRow[],
  futurePatientIds: Set<string>,
  opts: ClassifyOptions
): CycleAlerts {
  const upcoming: CycleAlert[] = [];
  const overdue: CycleAlert[] = [];
  const windowEndMs = opts.now.getTime() + opts.windowDays * MS_PER_DAY;
  const cooldownMs = opts.cooldownDays * MS_PER_DAY;

  for (const r of rows) {
    if (futurePatientIds.has(r.patientId)) continue;

    if (
      r.lastCycleReminderAt &&
      opts.now.getTime() - r.lastCycleReminderAt.getTime() < cooldownMs
    ) {
      continue;
    }

    const nextDue = computeNextDueDate({
      baseDate: r.lastAppointmentScheduledAt ?? r.startedAt,
      currentSession: r.currentSession,
      initialSessionsCount: r.initialSessionsCount,
      initialFrequencyWeeks: r.initialFrequencyWeeks,
      maintenanceFrequencyWeeks: r.maintenanceFrequencyWeeks,
    });
    if (!nextDue) continue;

    const daysUntilDue = Math.round(
      (nextDue.getTime() - opts.now.getTime()) / MS_PER_DAY
    );
    const alert: CycleAlert = {
      patientTreatmentId: r.patientTreatmentId,
      patientId: r.patientId,
      patientName: r.patientName,
      patientPhone: r.patientPhone,
      treatmentName: r.treatmentName,
      nextDueDate: nextDue.toISOString(),
      daysUntilDue,
      lastCycleReminderAt: r.lastCycleReminderAt?.toISOString() ?? null,
    };

    if (nextDue.getTime() < opts.now.getTime()) {
      overdue.push(alert);
    } else if (nextDue.getTime() <= windowEndMs) {
      upcoming.push(alert);
    }
  }

  upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  overdue.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  return { upcoming, overdue };
}

export interface DashboardKpis {
  todayCount: number;
  confirmedCount: number;
  pendingCount: number;
  todayRevenueCents: number;
}

export function computeKpis(today: AppointmentRow[]): DashboardKpis {
  let confirmedCount = 0;
  let pendingCount = 0;
  let todayRevenueCents = 0;
  for (const a of today) {
    if (a.status === 'confirmed') confirmedCount++;
    if (a.status === 'pending') pendingCount++;
    if (a.payment_status === 'paid') {
      todayRevenueCents += a.total_amount_cents ?? 0;
    }
  }
  return {
    todayCount: today.length,
    confirmedCount,
    pendingCount,
    todayRevenueCents,
  };
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function cycleWindowDays(): number {
  return envInt('CYCLE_ALERT_WINDOW_DAYS', 7);
}

export function cycleCooldownDays(): number {
  return envInt('CYCLE_REMINDER_COOLDOWN_DAYS', 14);
}

export async function fetchActiveCycleRows(
  tenantId: string
): Promise<CycleAlertRow[]> {
  const rows = await db
    .select({
      patientTreatmentId: patientTreatments.id,
      patientId: patientTreatments.patientId,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientPhone: patients.phone,
      treatmentName: treatments.name,
      currentSession: patientTreatments.currentSession,
      startedAt: patientTreatments.startedAt,
      lastCycleReminderAt: patientTreatments.lastCycleReminderAt,
      initialSessionsCount: treatments.initialSessionsCount,
      initialFrequencyWeeks: treatments.initialFrequencyWeeks,
      maintenanceFrequencyWeeks: treatments.maintenanceFrequencyWeeks,
      lastAppointmentScheduledAt: appointments.scheduledAt,
    })
    .from(patientTreatments)
    .innerJoin(treatments, eq(treatments.id, patientTreatments.treatmentId))
    .innerJoin(patients, eq(patients.id, patientTreatments.patientId))
    .leftJoin(
      appointments,
      eq(appointments.id, patientTreatments.lastAppointmentId)
    )
    .where(
      and(
        eq(patientTreatments.tenantId, tenantId),
        eq(patientTreatments.isActive, true)
      )
    );

  return rows.map((r) => ({
    patientTreatmentId: r.patientTreatmentId,
    patientId: r.patientId,
    patientName: `${r.patientFirstName} ${r.patientLastName}`,
    patientPhone: r.patientPhone ?? null,
    treatmentName: r.treatmentName,
    currentSession: r.currentSession,
    startedAt: r.startedAt ?? null,
    lastAppointmentScheduledAt: r.lastAppointmentScheduledAt ?? null,
    lastCycleReminderAt: r.lastCycleReminderAt ?? null,
    initialSessionsCount: r.initialSessionsCount ?? null,
    initialFrequencyWeeks: r.initialFrequencyWeeks ?? null,
    maintenanceFrequencyWeeks: r.maintenanceFrequencyWeeks ?? null,
  }));
}

export async function fetchFuturePatientIds(
  tenantId: string,
  now: Date
): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ patientId: appointments.patientId })
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        gte(appointments.scheduledAt, now),
        ne(appointments.status, 'cancelled')
      )
    );
  return new Set(rows.map((r) => r.patientId));
}

export async function getCycleAlerts(
  tenantId: string,
  opts?: Partial<ClassifyOptions>
): Promise<CycleAlerts> {
  const now = opts?.now ?? new Date();
  const windowDays = opts?.windowDays ?? cycleWindowDays();
  const cooldownDays = opts?.cooldownDays ?? cycleCooldownDays();

  const [rows, futurePatientIds] = await Promise.all([
    self.fetchActiveCycleRows(tenantId),
    self.fetchFuturePatientIds(tenantId, now),
  ]);

  return classifyCycleAlerts(rows, futurePatientIds, {
    now,
    windowDays,
    cooldownDays,
  });
}

export interface DebtSummary {
  totalPendingCents: number;
  patientCount: number;
}

export interface DashboardData {
  todayAppointments: AppointmentRow[];
  cycleAlerts: CycleAlerts;
  kpis: DashboardKpis;
  debtSummary: DebtSummary;
}

function todayStringInBuenosAires(now: Date): string {
  // en-CA yields YYYY-MM-DD
  return now.toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export async function getDashboard(tenantId: string): Promise<DashboardData> {
  const now = new Date();
  const today = todayStringInBuenosAires(now);

  const [todayAppointments, cycleAlerts, stats] = await Promise.all([
    appointmentService.list(tenantId, { date: today }),
    self.getCycleAlerts(tenantId, { now }),
    debtDashboardService.calculateStatistics(tenantId),
  ]);

  return {
    todayAppointments,
    cycleAlerts,
    kpis: computeKpis(todayAppointments),
    debtSummary: {
      totalPendingCents: stats.totalUnpaidCents,
      patientCount: stats.patientsWithBalance,
    },
  };
}
