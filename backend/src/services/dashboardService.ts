import { computeNextDueDate } from './patientTreatmentService.js';
import type { AppointmentRow } from './appointmentService.js';

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
