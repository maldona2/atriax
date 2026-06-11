import {
  classifyCycleAlerts,
  computeKpis,
  type CycleAlertRow,
} from './dashboardService.js';
import type { AppointmentRow } from './appointmentService.js';
import * as dashboardService from './dashboardService.js';
import * as appointmentService from './appointmentService.js';
import { debtDashboardService } from './debtDashboardService.js';
import { whatsAppNotificationService } from '../whatsapp/services/WhatsAppNotificationService.js';

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

describe('getCycleAlerts', () => {
  afterEach(() => jest.restoreAllMocks());

  it('composes fetchers and classifies', async () => {
    jest
      .spyOn(dashboardService, 'fetchActiveCycleRows')
      .mockResolvedValue([row()]);
    jest
      .spyOn(dashboardService, 'fetchFuturePatientIds')
      .mockResolvedValue(new Set<string>());

    const result = await dashboardService.getCycleAlerts('t-1', {
      now: NOW,
      windowDays: 7,
      cooldownDays: 14,
    });
    expect(result.upcoming).toHaveLength(1);
  });
});

describe('getDashboard', () => {
  afterEach(() => jest.restoreAllMocks());

  it('aggregates today appointments, cycle alerts, kpis and debt summary', async () => {
    jest.spyOn(appointmentService, 'list').mockResolvedValue([
      {
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
      },
    ]);
    jest
      .spyOn(dashboardService, 'getCycleAlerts')
      .mockResolvedValue({ upcoming: [], overdue: [] });
    jest.spyOn(debtDashboardService, 'calculateStatistics').mockResolvedValue({
      totalPaidCents: 0,
      totalUnpaidCents: 50000,
      collectionRate: 0,
      patientsWithBalance: 3,
      averageDebtCents: 0,
      totalTreatmentCostsCents: 0,
      realIncomeCents: 0,
      profitMarginPercentage: 0,
      lastUpdated: NOW.toISOString(),
    });

    const data = await dashboardService.getDashboard('t-1');
    expect(data.todayAppointments).toHaveLength(1);
    expect(data.kpis.todayRevenueCents).toBe(10000);
    expect(data.debtSummary).toEqual({
      totalPendingCents: 50000,
      patientCount: 3,
    });
    expect(data.cycleAlerts).toEqual({ upcoming: [], overdue: [] });
  });
});

describe('sendCycleReminder', () => {
  const ctxBase = {
    patientTreatmentId: 'pt-1',
    patientName: 'Ana Pérez',
    patientPhone: '+5491100000000',
    treatmentName: 'Botox',
    professionalName: 'Dra. López',
    address: 'Av. 1',
    isActive: true,
    subscriptionPlan: 'gold',
    subscriptionStatus: 'active',
    lastCycleReminderAt: null as Date | null,
  };

  afterEach(() => jest.restoreAllMocks());

  it('sends and stamps lastCycleReminderAt for an eligible gold tenant', async () => {
    jest
      .spyOn(dashboardService, 'fetchCycleReminderContext')
      .mockResolvedValue({ ...ctxBase });
    const sendSpy = jest
      .spyOn(whatsAppNotificationService, 'sendCycleReminder')
      .mockResolvedValue();
    const markSpy = jest
      .spyOn(dashboardService, 'markCycleReminderSent')
      .mockResolvedValue();

    const res = await dashboardService.sendCycleReminder('t-1', 'pt-1');
    expect(res.status).toBe('sent');
    expect(sendSpy).toHaveBeenCalledWith('+5491100000000', {
      patientName: 'Ana Pérez',
      treatmentName: 'Botox',
      professionalName: 'Dra. López',
      address: 'Av. 1',
    });
    expect(markSpy).toHaveBeenCalledWith('t-1', 'pt-1');
  });

  it('throws 404 when the patient treatment is not found', async () => {
    jest
      .spyOn(dashboardService, 'fetchCycleReminderContext')
      .mockResolvedValue(null);
    await expect(
      dashboardService.sendCycleReminder('t-1', 'missing')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 when the tenant is not on an active gold plan', async () => {
    jest
      .spyOn(dashboardService, 'fetchCycleReminderContext')
      .mockResolvedValue({
        ...ctxBase,
        subscriptionPlan: 'silver',
      });
    await expect(
      dashboardService.sendCycleReminder('t-1', 'pt-1')
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 400 when the patient has no phone', async () => {
    jest
      .spyOn(dashboardService, 'fetchCycleReminderContext')
      .mockResolvedValue({ ...ctxBase, patientPhone: null });
    await expect(
      dashboardService.sendCycleReminder('t-1', 'pt-1')
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 409 when within the cooldown window', async () => {
    jest
      .spyOn(dashboardService, 'fetchCycleReminderContext')
      .mockResolvedValue({
        ...ctxBase,
        lastCycleReminderAt: new Date(Date.now() - 1000),
      });
    await expect(
      dashboardService.sendCycleReminder('t-1', 'pt-1')
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('dismissCycleAlert', () => {
  const ctxBase = {
    patientTreatmentId: 'pt-1',
    patientName: 'Ana Pérez',
    patientPhone: '+5491100000000',
    treatmentName: 'Botox',
    professionalName: 'Dra. López',
    address: 'Av. 1',
    isActive: true,
    subscriptionPlan: 'silver',
    subscriptionStatus: 'active',
    lastCycleReminderAt: null as Date | null,
  };

  afterEach(() => jest.restoreAllMocks());

  it('stamps lastCycleReminderAt without sending WhatsApp', async () => {
    jest
      .spyOn(dashboardService, 'fetchCycleReminderContext')
      .mockResolvedValue({ ...ctxBase });
    const sendSpy = jest
      .spyOn(whatsAppNotificationService, 'sendCycleReminder')
      .mockResolvedValue();
    const markSpy = jest
      .spyOn(dashboardService, 'markCycleReminderSent')
      .mockResolvedValue();

    const res = await dashboardService.dismissCycleAlert('t-1', 'pt-1');
    expect(res.status).toBe('dismissed');
    expect(sendSpy).not.toHaveBeenCalled();
    expect(markSpy).toHaveBeenCalledWith('t-1', 'pt-1');
  });

  it('throws 404 when the patient treatment is not found', async () => {
    jest
      .spyOn(dashboardService, 'fetchCycleReminderContext')
      .mockResolvedValue(null);
    await expect(
      dashboardService.dismissCycleAlert('t-1', 'missing')
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
