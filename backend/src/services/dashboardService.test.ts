import {
  classifyCycleAlerts,
  computeKpis,
  type CycleAlertRow,
} from './dashboardService.js';
import type { AppointmentRow } from './appointmentService.js';

const NOW = new Date('2026-06-11T12:00:00.000Z');

function row(overrides: Partial<CycleAlertRow> = {}): CycleAlertRow {
  return {
    patientTreatmentId: 'pt-1',
    patientId: 'p-1',
    patientName: 'Ana Pérez',
    patientPhone: '+5491100000000',
    treatmentName: 'Botox',
    currentSession: 1,
    startedAt: new Date('2026-01-01T10:00:00.000Z'),
    lastAppointmentScheduledAt: new Date('2026-06-01T10:00:00.000Z'),
    lastCycleReminderAt: null,
    initialSessionsCount: 3,
    initialFrequencyWeeks: 2,
    maintenanceFrequencyWeeks: 12,
    ...overrides,
  };
}

const OPTS = { now: NOW, windowDays: 7, cooldownDays: 14 };

describe('classifyCycleAlerts', () => {
  it('classifies a treatment due within the window as upcoming', () => {
    const { upcoming, overdue } = classifyCycleAlerts([row()], new Set(), OPTS);
    expect(overdue).toHaveLength(0);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].patientName).toBe('Ana Pérez');
    expect(upcoming[0].nextDueDate).toBe('2026-06-15T10:00:00.000Z');
  });

  it('classifies a past due date as overdue', () => {
    const r = row({
      lastAppointmentScheduledAt: new Date('2026-03-01T10:00:00.000Z'),
    });
    const { upcoming, overdue } = classifyCycleAlerts([r], new Set(), OPTS);
    expect(upcoming).toHaveLength(0);
    expect(overdue).toHaveLength(1);
  });

  it('excludes patients who already have a future appointment', () => {
    const future = new Set<string>(['p-1']);
    const { upcoming, overdue } = classifyCycleAlerts([row()], future, OPTS);
    expect(upcoming).toHaveLength(0);
    expect(overdue).toHaveLength(0);
  });

  it('suppresses alerts within the cooldown window', () => {
    const r = row({
      lastCycleReminderAt: new Date('2026-06-05T10:00:00.000Z'),
    });
    const { upcoming, overdue } = classifyCycleAlerts([r], new Set(), OPTS);
    expect(upcoming).toHaveLength(0);
    expect(overdue).toHaveLength(0);
  });

  it('does NOT suppress when the last reminder is older than the cooldown', () => {
    const r = row({
      lastCycleReminderAt: new Date('2026-05-01T10:00:00.000Z'),
    });
    const { upcoming } = classifyCycleAlerts([r], new Set(), OPTS);
    expect(upcoming).toHaveLength(1);
  });

  it('skips treatments whose next due date cannot be computed (no frequency)', () => {
    const r = row({ initialFrequencyWeeks: null, currentSession: 1 });
    const { upcoming, overdue } = classifyCycleAlerts([r], new Set(), OPTS);
    expect(upcoming).toHaveLength(0);
    expect(overdue).toHaveLength(0);
  });

  it('falls back to startedAt when there is no last appointment', () => {
    const r = row({
      lastAppointmentScheduledAt: null,
      startedAt: new Date('2026-06-10T10:00:00.000Z'),
    });
    const { upcoming, overdue } = classifyCycleAlerts([r], new Set(), OPTS);
    expect(upcoming).toHaveLength(0);
    expect(overdue).toHaveLength(0);
  });
});

describe('computeKpis', () => {
  function appt(overrides: Partial<AppointmentRow> = {}): AppointmentRow {
    return {
      id: 'a-1',
      tenant_id: 't-1',
      patient_id: 'p-1',
      scheduled_at: NOW,
      duration_minutes: 60,
      status: 'confirmed',
      payment_status: 'paid',
      total_amount_cents: 10000,
      notes: null,
      created_at: null,
      updated_at: null,
      ...overrides,
    };
  }

  it('counts totals and sums revenue from paid appointments only', () => {
    const kpis = computeKpis([
      appt({
        status: 'confirmed',
        payment_status: 'paid',
        total_amount_cents: 10000,
      }),
      appt({
        id: 'a-2',
        status: 'pending',
        payment_status: 'unpaid',
        total_amount_cents: 5000,
      }),
      appt({
        id: 'a-3',
        status: 'completed',
        payment_status: 'paid',
        total_amount_cents: 7000,
      }),
    ]);
    expect(kpis.todayCount).toBe(3);
    expect(kpis.confirmedCount).toBe(1);
    expect(kpis.pendingCount).toBe(1);
    expect(kpis.todayRevenueCents).toBe(17000);
  });

  it('returns zeros for an empty day', () => {
    expect(computeKpis([])).toEqual({
      todayCount: 0,
      confirmedCount: 0,
      pendingCount: 0,
      todayRevenueCents: 0,
    });
  });
});
