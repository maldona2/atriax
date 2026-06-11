# Dashboard / Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/app/dashboard` home screen showing treatment-cycle reminders (upcoming + overdue), today's appointments, quick KPIs, and a debt summary, with a one-click WhatsApp cycle reminder.

**Architecture:** A new backend `dashboardService` exposes pure functions (classification, KPI math) wrapped by thin DB fetchers, aggregated by `getDashboard(tenantId)` behind `GET /api/dashboard`. A `POST /api/dashboard/cycle-reminder/:patientTreatmentId` sends a WhatsApp reminder via a new Meta template, gated by Gold plan + a per-treatment cooldown. The frontend renders a `DashboardPage` (Layout A) fed by a `useDashboard` hook. The cycle date math reuses/refactors the existing `patientTreatmentService` helper (DRY).

**Tech Stack:** Backend — Node/Express, Drizzle ORM (PostgreSQL), Jest + supertest. Frontend — React 19, React Router v7, Axios, Tailwind, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-11-dashboard-home-design.md`

---

## File Structure

**Backend (create):**
- `backend/src/services/dashboardService.ts` — cycle-alert classification (pure), KPI math (pure), DB fetchers, `getDashboard`, `sendCycleReminder`.
- `backend/src/services/dashboardService.test.ts` — unit tests for pure functions + composed functions (deps spied).
- `backend/src/routes/dashboard.ts` — `GET /` and `POST /cycle-reminder/:patientTreatmentId`.
- `backend/src/routes/dashboard.test.ts` — route tests (supertest, service mocked).

**Backend (modify):**
- `backend/src/db/schema.ts` — add `lastCycleReminderAt` column to `patientTreatments`.
- `backend/src/services/patientTreatmentService.ts` — extract pure `computeNextDueDate`, refactor `calculateNextAppointment` to delegate, add `lastCycleReminderAt` to `PatientTreatmentRow`/`toRow`.
- `backend/src/services/patientTreatmentService.test.ts` — **create**: unit tests for `computeNextDueDate`.
- `backend/src/whatsapp/templates.ts` — add `CycleReminderData` + `cycleReminderTemplate`.
- `backend/src/whatsapp/templates.test.ts` — **create**: unit test for `cycleReminderTemplate`.
- `backend/src/whatsapp/services/WhatsAppNotificationService.ts` — add `sendCycleReminder`.
- `backend/src/app.ts` — mount `/api/dashboard`.
- `backend/drizzle/00XX_*.sql` — generated migration (via `db:generate`).

**Frontend (create):**
- `frontend/src/types/dashboard.ts` — shared response types.
- `frontend/src/lib/dashboardApi.ts` — `fetchDashboard`, `sendCycleReminder`.
- `frontend/src/hooks/useDashboard.ts` — fetch + refresh.
- `frontend/src/hooks/useDashboard.test.ts` — vitest.
- `frontend/src/components/dashboard/CycleAlertsPanel.tsx`
- `frontend/src/components/dashboard/TodayAppointmentsPanel.tsx`
- `frontend/src/components/dashboard/KpisPanel.tsx`
- `frontend/src/components/dashboard/DebtSummaryPanel.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/__tests__/DashboardPage.test.tsx` — smoke render (hook mocked).

**Frontend (modify):**
- `frontend/src/App.tsx` — add `/app/dashboard` route, change `/app` index redirect.
- `frontend/src/components/layout/AppLayout.tsx` — add "Inicio" sidebar item.

---

## Task 1: Extract pure `computeNextDueDate` helper

DRY: `patientTreatmentService.calculateNextAppointment` already encodes the initial-vs-maintenance phase math. Extract the core into a pure, primitive-input function that both it and the dashboard can call. The new function adds nothing semantically except taking a `baseDate` directly (so the dashboard can pass `startedAt` as a fallback when there is no last appointment).

**Files:**
- Modify: `backend/src/services/patientTreatmentService.ts`
- Test: `backend/src/services/patientTreatmentService.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/patientTreatmentService.test.ts`:

```typescript
import { computeNextDueDate } from './patientTreatmentService.js';

describe('computeNextDueDate', () => {
  const base = new Date('2026-01-01T10:00:00.000Z');

  it('returns null when baseDate is null', () => {
    expect(
      computeNextDueDate({
        baseDate: null,
        currentSession: 1,
        initialSessionsCount: 3,
        initialFrequencyWeeks: 2,
        maintenanceFrequencyWeeks: 12,
      })
    ).toBeNull();
  });

  it('uses initial frequency while in the initial phase', () => {
    // currentSession (1) < initialSessionsCount (3) => initial phase, +2 weeks
    const result = computeNextDueDate({
      baseDate: base,
      currentSession: 1,
      initialSessionsCount: 3,
      initialFrequencyWeeks: 2,
      maintenanceFrequencyWeeks: 12,
    });
    expect(result).toEqual(new Date('2026-01-15T10:00:00.000Z'));
  });

  it('switches to maintenance frequency once currentSession >= initialSessionsCount', () => {
    // currentSession (3) >= initialSessionsCount (3) => maintenance, +12 weeks
    const result = computeNextDueDate({
      baseDate: base,
      currentSession: 3,
      initialSessionsCount: 3,
      initialFrequencyWeeks: 2,
      maintenanceFrequencyWeeks: 12,
    });
    expect(result).toEqual(new Date('2026-03-26T10:00:00.000Z'));
  });

  it('returns null when the applicable frequency is null (initial phase, no initial freq)', () => {
    expect(
      computeNextDueDate({
        baseDate: base,
        currentSession: 1,
        initialSessionsCount: 3,
        initialFrequencyWeeks: null,
        maintenanceFrequencyWeeks: 12,
      })
    ).toBeNull();
  });

  it('returns null in maintenance phase when maintenance frequency is null', () => {
    expect(
      computeNextDueDate({
        baseDate: base,
        currentSession: 5,
        initialSessionsCount: 3,
        initialFrequencyWeeks: 2,
        maintenanceFrequencyWeeks: null,
      })
    ).toBeNull();
  });

  it('treats null initialSessionsCount as "not in initial phase complete" and uses initial frequency', () => {
    // initialSessionsCount null => initialPhaseComplete false => initial freq (+2 weeks)
    const result = computeNextDueDate({
      baseDate: base,
      currentSession: 4,
      initialSessionsCount: null,
      initialFrequencyWeeks: 2,
      maintenanceFrequencyWeeks: 12,
    });
    expect(result).toEqual(new Date('2026-01-15T10:00:00.000Z'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/services/patientTreatmentService.test.ts`
Expected: FAIL — `computeNextDueDate is not a function` / not exported.

- [ ] **Step 3: Add the pure helper and refactor `calculateNextAppointment` to delegate**

In `backend/src/services/patientTreatmentService.ts`, add this exported function (place it directly above the existing `calculateNextAppointment`):

```typescript
export interface NextDueDateParams {
  baseDate: Date | null;
  currentSession: number;
  initialSessionsCount: number | null;
  initialFrequencyWeeks: number | null;
  maintenanceFrequencyWeeks: number | null;
}

/**
 * Pure cycle-date math. Returns the next expected visit date by adding the
 * applicable frequency (initial vs maintenance phase) to baseDate, or null when
 * it cannot be computed (no baseDate or the applicable frequency is unset).
 */
export function computeNextDueDate(params: NextDueDateParams): Date | null {
  const {
    baseDate,
    currentSession,
    initialSessionsCount,
    initialFrequencyWeeks,
    maintenanceFrequencyWeeks,
  } = params;

  if (!baseDate) return null;

  const initialPhaseComplete =
    initialSessionsCount !== null && currentSession >= initialSessionsCount;

  let weeksToAdd: number | null = null;
  if (!initialPhaseComplete && initialFrequencyWeeks !== null) {
    weeksToAdd = initialFrequencyWeeks;
  } else if (initialPhaseComplete && maintenanceFrequencyWeeks !== null) {
    weeksToAdd = maintenanceFrequencyWeeks;
  }

  if (weeksToAdd === null) return null;

  const next = new Date(baseDate);
  next.setDate(next.getDate() + weeksToAdd * 7);
  return next;
}
```

Then replace the body of the existing `calculateNextAppointment` so it delegates (keep its exported signature unchanged):

```typescript
export function calculateNextAppointment(
  treatment: treatmentService.TreatmentRow,
  patientTreatment: PatientTreatmentRow,
  lastAppointmentDate: Date | null
): Date | null {
  return computeNextDueDate({
    baseDate: lastAppointmentDate,
    currentSession: patientTreatment.current_session,
    initialSessionsCount: treatment.initial_sessions_count,
    initialFrequencyWeeks: treatment.initial_frequency_weeks,
    maintenanceFrequencyWeeks: treatment.maintenance_frequency_weeks,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest src/services/patientTreatmentService.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/patientTreatmentService.ts backend/src/services/patientTreatmentService.test.ts
git commit -m "refactor(treatments): extract pure computeNextDueDate helper"
```

---

## Task 2: Add `lastCycleReminderAt` column to `patientTreatments`

**Files:**
- Modify: `backend/src/db/schema.ts:190-224`
- Modify: `backend/src/services/patientTreatmentService.ts` (row mapping)
- Generated: `backend/drizzle/00XX_*.sql`

- [ ] **Step 1: Add the column to the schema**

In `backend/src/db/schema.ts`, inside the `patientTreatments` `pgTable` column block (after the `completedAt` line, before `createdAt`), add:

```typescript
    lastCycleReminderAt: timestamp('last_cycle_reminder_at', {
      withTimezone: true,
    }),
```

- [ ] **Step 2: Surface the column in the service row mapping**

In `backend/src/services/patientTreatmentService.ts`:

Add to the `PatientTreatmentRow` interface (after `completed_at`):

```typescript
  last_cycle_reminder_at: Date | null;
```

Add to the object returned by `toRow` (after `completed_at: t.completedAt ?? null,`):

```typescript
    last_cycle_reminder_at: t.lastCycleReminderAt ?? null,
```

- [ ] **Step 3: Generate the migration**

Run: `cd backend && npm run db:generate`
Expected: a new file `backend/drizzle/00XX_*.sql` containing `ALTER TABLE "patient_treatments" ADD COLUMN "last_cycle_reminder_at" timestamp with time zone;`. Open it and confirm it only adds that column.

- [ ] **Step 4: Verify the project still type-checks and existing tests pass**

Run: `cd backend && npx tsc --noEmit && npx jest src/services/patientTreatmentService.test.ts`
Expected: no type errors; tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/schema.ts backend/src/services/patientTreatmentService.ts backend/drizzle
git commit -m "feat(db): add last_cycle_reminder_at to patient_treatments"
```

> **Note for the executor:** Apply the migration to your dev DB with `cd backend && npm run db:migrate` before manual end-to-end testing (Task 12). It is not required for unit tests.

---

## Task 3: WhatsApp cycle-reminder template + send method

The new Meta template `recordatorio_ciclo` must be submitted to Meta Business Manager for approval (body copy below). Until approved, real sends fail and are logged — consistent with the existing fire-and-forget pattern.

**Files:**
- Modify: `backend/src/whatsapp/templates.ts`
- Test: `backend/src/whatsapp/templates.test.ts` (create)
- Modify: `backend/src/whatsapp/services/WhatsAppNotificationService.ts`

- [ ] **Step 1: Write the failing test for the template builder**

Create `backend/src/whatsapp/templates.test.ts`:

```typescript
import { cycleReminderTemplate } from './templates.js';

describe('cycleReminderTemplate', () => {
  it('builds the recordatorio_ciclo template with ordered params', () => {
    const msg = cycleReminderTemplate({
      patientName: 'Ana Pérez',
      treatmentName: 'Botox',
      professionalName: 'Dra. López',
      address: 'Av. Siempreviva 742',
    });
    expect(msg.templateName).toBe('recordatorio_ciclo');
    expect(msg.languageCode).toBe('es_AR');
    expect(msg.bodyParameters).toEqual([
      'Ana Pérez',
      'Botox',
      'Dra. López',
      'Av. Siempreviva 742',
    ]);
  });

  it('falls back to "A confirmar" when address is null', () => {
    const msg = cycleReminderTemplate({
      patientName: 'Ana Pérez',
      treatmentName: 'Botox',
      professionalName: 'Dra. López',
      address: null,
    });
    expect(msg.bodyParameters[3]).toBe('A confirmar');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/whatsapp/templates.test.ts`
Expected: FAIL — `cycleReminderTemplate is not a function`.

- [ ] **Step 3: Add the type, template comment, and builder**

In `backend/src/whatsapp/templates.ts`, add the interface near the top (after `AppointmentNotificationData`):

```typescript
export interface CycleReminderData {
  patientName: string;
  treatmentName: string;
  professionalName: string;
  address?: string | null;
}
```

Add this template-registration comment to the comment block (after the `recordatorio_turno` entry, before the `NOTA:` line):

```typescript
//
// recordatorio_ciclo (4 params):
//   Hola {{1}}, te escribimos de parte de {{3}}.
//   Según tu tratamiento de {{2}}, ya estás en fecha para tu próxima sesión.
//   📍 Dirección: {{4}}
//   Respondé este mensaje para coordinar tu próximo turno.
```

Add the builder (place it after `appointmentReminderTemplate`):

```typescript
export function cycleReminderTemplate(
  data: CycleReminderData
): WhatsAppTemplateMessage {
  return {
    templateName: 'recordatorio_ciclo',
    languageCode: 'es_AR',
    bodyParameters: [
      data.patientName,
      data.treatmentName,
      data.professionalName,
      data.address ?? ADDRESS_FALLBACK,
    ],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/whatsapp/templates.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Add `sendCycleReminder` to the notification service**

In `backend/src/whatsapp/services/WhatsAppNotificationService.ts`:

Update the templates import to include the new symbols:

```typescript
import {
  appointmentBookedTemplate,
  appointmentConfirmedTemplate,
  appointmentCancelledTemplate,
  appointmentReminderTemplate,
  cycleReminderTemplate,
  type AppointmentNotificationData,
  type CycleReminderData,
  type WhatsAppTemplateMessage,
} from '../templates.js';
```

Re-export the new type alongside the existing one:

```typescript
export type { AppointmentNotificationData, CycleReminderData };
```

Add the method (after `sendAppointmentReminder`):

```typescript
  async sendCycleReminder(
    phone: string,
    data: CycleReminderData
  ): Promise<void> {
    await this._sendTemplate(phone, cycleReminderTemplate(data), 'cycle');
  }
```

- [ ] **Step 6: Verify type-check and tests**

Run: `cd backend && npx tsc --noEmit && npx jest src/whatsapp`
Expected: no type errors; WhatsApp tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/whatsapp/templates.ts backend/src/whatsapp/templates.test.ts backend/src/whatsapp/services/WhatsAppNotificationService.ts
git commit -m "feat(whatsapp): add recordatorio_ciclo template and sendCycleReminder"
```

---

## Task 4: Pure cycle-alert classifier + KPI math

These are the two pure cores of the dashboard. They take already-fetched plain data and produce the response shapes, so they are fully unit-testable without a DB.

**Files:**
- Create: `backend/src/services/dashboardService.ts`
- Test: `backend/src/services/dashboardService.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `backend/src/services/dashboardService.test.ts`:

```typescript
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
    initialFrequencyWeeks: 2, // last appt 2026-06-01 + 2w => due 2026-06-15 (within 7d window)
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
    // last appt 2026-03-01 + 2w => due 2026-03-15, well before NOW
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
      lastCycleReminderAt: new Date('2026-06-05T10:00:00.000Z'), // 6 days ago < 14d cooldown
    });
    const { upcoming, overdue } = classifyCycleAlerts([r], new Set(), OPTS);
    expect(upcoming).toHaveLength(0);
    expect(overdue).toHaveLength(0);
  });

  it('does NOT suppress when the last reminder is older than the cooldown', () => {
    const r = row({
      lastCycleReminderAt: new Date('2026-05-01T10:00:00.000Z'), // >14 days ago
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
    // no last appt; startedAt 2026-06-10 + 2w => due 2026-06-24, beyond 7d window => not alerted
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
      appt({ status: 'confirmed', payment_status: 'paid', total_amount_cents: 10000 }),
      appt({ id: 'a-2', status: 'pending', payment_status: 'unpaid', total_amount_cents: 5000 }),
      appt({ id: 'a-3', status: 'completed', payment_status: 'paid', total_amount_cents: 7000 }),
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest src/services/dashboardService.test.ts`
Expected: FAIL — module `./dashboardService.js` not found.

- [ ] **Step 3: Create the service with the pure functions and types**

Create `backend/src/services/dashboardService.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest src/services/dashboardService.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/dashboardService.ts backend/src/services/dashboardService.test.ts
git commit -m "feat(dashboard): pure cycle-alert classifier and KPI math"
```

---

## Task 5: DB fetchers + `getCycleAlerts` + `getDashboard`

Add the thin DB-access functions and the composing functions. The composers are tested by spying on the fetchers (no DB-chain mocking).

**Files:**
- Modify: `backend/src/services/dashboardService.ts`
- Modify: `backend/src/services/dashboardService.test.ts`

- [ ] **Step 1: Write the failing tests for the composers**

Append to `backend/src/services/dashboardService.test.ts`:

```typescript
import * as dashboardService from './dashboardService.js';
import * as appointmentService from './appointmentService.js';
import { debtDashboardService } from './debtDashboardService.js';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest src/services/dashboardService.test.ts`
Expected: FAIL — `fetchActiveCycleRows`/`getCycleAlerts`/`getDashboard` not exported.

- [ ] **Step 3: Implement fetchers and composers**

Add imports at the top of `backend/src/services/dashboardService.ts`:

```typescript
import { and, eq, gte, ne } from 'drizzle-orm';
import {
  db,
  patientTreatments,
  treatments,
  patients,
  appointments,
} from '../db/client.js';
import * as appointmentService from './appointmentService.js';
import { debtDashboardService } from './debtDashboardService.js';
```

Add the config readers and functions at the end of the file:

```typescript
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
    fetchActiveCycleRows(tenantId),
    fetchFuturePatientIds(tenantId, now),
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
    getCycleAlerts(tenantId, { now }),
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
```

> **Note:** the `getDashboard` test spies on `dashboardService.getCycleAlerts`. For the spy to intercept the in-module call, `getDashboard` must call it via the module namespace. Change the call inside `getDashboard` from `getCycleAlerts(...)` to:
> ```typescript
> import * as self from './dashboardService.js';
> // ...
>   self.getCycleAlerts(tenantId, { now }),
> ```
> Add `import * as self from './dashboardService.js';` to the imports and use `self.getCycleAlerts` / `self.fetchActiveCycleRows` / `self.fetchFuturePatientIds` at their call sites so the Task 5 spies work.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest src/services/dashboardService.test.ts`
Expected: PASS (all, including the two new describes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/dashboardService.ts backend/src/services/dashboardService.test.ts
git commit -m "feat(dashboard): cycle-alert fetchers and getDashboard aggregation"
```

---

## Task 6: `sendCycleReminder` action (Gold gate + cooldown + send)

**Files:**
- Modify: `backend/src/services/dashboardService.ts`
- Modify: `backend/src/services/dashboardService.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `backend/src/services/dashboardService.test.ts`:

```typescript
import { whatsAppNotificationService } from '../whatsapp/services/WhatsAppNotificationService.js';

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
    jest.spyOn(dashboardService, 'fetchCycleReminderContext').mockResolvedValue({
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
    jest.spyOn(dashboardService, 'fetchCycleReminderContext').mockResolvedValue({
      ...ctxBase,
      lastCycleReminderAt: new Date(Date.now() - 1000), // just now
    });
    await expect(
      dashboardService.sendCycleReminder('t-1', 'pt-1')
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest src/services/dashboardService.test.ts -t sendCycleReminder`
Expected: FAIL — `fetchCycleReminderContext`/`markCycleReminderSent`/`sendCycleReminder` not exported.

- [ ] **Step 3: Implement the context fetcher, stamp, and action**

Add to imports in `backend/src/services/dashboardService.ts` (extend the existing db import and add the whatsapp + users imports):

```typescript
import { users } from '../db/client.js';
import { whatsAppNotificationService } from '../whatsapp/services/WhatsAppNotificationService.js';
```

Add to the end of the file:

```typescript
export interface CycleReminderContext {
  patientTreatmentId: string;
  patientName: string;
  patientPhone: string | null;
  treatmentName: string;
  professionalName: string;
  address: string | null;
  isActive: boolean;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  lastCycleReminderAt: Date | null;
}

export async function fetchCycleReminderContext(
  tenantId: string,
  patientTreatmentId: string
): Promise<CycleReminderContext | null> {
  const [row] = await db
    .select({
      patientTreatmentId: patientTreatments.id,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientPhone: patients.phone,
      treatmentName: treatments.name,
      isActive: patientTreatments.isActive,
      lastCycleReminderAt: patientTreatments.lastCycleReminderAt,
    })
    .from(patientTreatments)
    .innerJoin(treatments, eq(treatments.id, patientTreatments.treatmentId))
    .innerJoin(patients, eq(patients.id, patientTreatments.patientId))
    .where(
      and(
        eq(patientTreatments.id, patientTreatmentId),
        eq(patientTreatments.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!row) return null;

  const [prof] = await db
    .select({
      fullName: users.fullName,
      address: users.address,
      subscriptionPlan: users.subscriptionPlan,
      subscriptionStatus: users.subscriptionStatus,
    })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, 'professional')))
    .limit(1);

  return {
    patientTreatmentId: row.patientTreatmentId,
    patientName: `${row.patientFirstName} ${row.patientLastName}`,
    patientPhone: row.patientPhone ?? null,
    treatmentName: row.treatmentName,
    professionalName: prof?.fullName ?? 'El profesional',
    address: prof?.address ?? null,
    isActive: row.isActive,
    subscriptionPlan: prof?.subscriptionPlan ?? null,
    subscriptionStatus: prof?.subscriptionStatus ?? null,
    lastCycleReminderAt: row.lastCycleReminderAt ?? null,
  };
}

export async function markCycleReminderSent(
  tenantId: string,
  patientTreatmentId: string
): Promise<void> {
  await db
    .update(patientTreatments)
    .set({ lastCycleReminderAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(patientTreatments.id, patientTreatmentId),
        eq(patientTreatments.tenantId, tenantId)
      )
    );
}

function httpError(statusCode: number, message: string): Error {
  const err = new Error(message);
  (err as Error & { statusCode?: number }).statusCode = statusCode;
  return err;
}

export interface SendCycleReminderResult {
  status: 'sent';
}

export async function sendCycleReminder(
  tenantId: string,
  patientTreatmentId: string
): Promise<SendCycleReminderResult> {
  const ctx = await self.fetchCycleReminderContext(
    tenantId,
    patientTreatmentId
  );
  if (!ctx || !ctx.isActive) {
    throw httpError(404, 'Tratamiento no encontrado');
  }

  const isGold =
    ctx.subscriptionPlan === 'gold' && ctx.subscriptionStatus === 'active';
  if (!isGold) {
    throw httpError(403, 'El recordatorio por WhatsApp requiere el plan Gold');
  }

  if (!ctx.patientPhone) {
    throw httpError(400, 'El paciente no tiene un teléfono cargado');
  }

  const cooldownMs = cycleCooldownDays() * MS_PER_DAY;
  if (
    ctx.lastCycleReminderAt &&
    Date.now() - ctx.lastCycleReminderAt.getTime() < cooldownMs
  ) {
    throw httpError(409, 'Ya se envió un recordatorio recientemente');
  }

  await whatsAppNotificationService.sendCycleReminder(ctx.patientPhone, {
    patientName: ctx.patientName,
    treatmentName: ctx.treatmentName,
    professionalName: ctx.professionalName,
    address: ctx.address,
  });

  await self.markCycleReminderSent(tenantId, patientTreatmentId);
  return { status: 'sent' };
}
```

> The `self.fetchCycleReminderContext` / `self.markCycleReminderSent` calls use the same `import * as self` namespace added in Task 5 so the spies intercept them.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest src/services/dashboardService.test.ts`
Expected: PASS (all describes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/dashboardService.ts backend/src/services/dashboardService.test.ts
git commit -m "feat(dashboard): sendCycleReminder action with gold gate and cooldown"
```

---

## Task 7: Dashboard routes + mount

**Files:**
- Create: `backend/src/routes/dashboard.ts`
- Test: `backend/src/routes/dashboard.test.ts`
- Modify: `backend/src/app.ts:71-94`

- [ ] **Step 1: Write the failing route tests**

Create `backend/src/routes/dashboard.test.ts`:

```typescript
import request from 'supertest';
import express, { Express } from 'express';
import dashboardRouter from './dashboard.js';
import * as dashboardService from '../services/dashboardService.js';
import { errorHandler } from '../utils/errorHandler.js';

jest.mock('../services/dashboardService.js');

jest.mock('../middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { tenantId: 'test-tenant-id', role: 'professional' };
    next();
  },
}));

jest.mock('../middleware/requireRole.js', () => ({
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

describe('Dashboard Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardRouter);
    app.use(errorHandler);
    jest.clearAllMocks();
  });

  it('GET /api/dashboard returns aggregated data', async () => {
    (dashboardService.getDashboard as jest.Mock).mockResolvedValue({
      todayAppointments: [],
      cycleAlerts: { upcoming: [], overdue: [] },
      kpis: {
        todayCount: 0,
        confirmedCount: 0,
        pendingCount: 0,
        todayRevenueCents: 0,
      },
      debtSummary: { totalPendingCents: 0, patientCount: 0 },
    });

    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.cycleAlerts).toEqual({ upcoming: [], overdue: [] });
    expect(dashboardService.getDashboard).toHaveBeenCalledWith('test-tenant-id');
  });

  it('POST /api/dashboard/cycle-reminder/:id returns the send result', async () => {
    (dashboardService.sendCycleReminder as jest.Mock).mockResolvedValue({
      status: 'sent',
    });

    const res = await request(app).post(
      '/api/dashboard/cycle-reminder/11111111-1111-1111-1111-111111111111'
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'sent' });
    expect(dashboardService.sendCycleReminder).toHaveBeenCalledWith(
      'test-tenant-id',
      '11111111-1111-1111-1111-111111111111'
    );
  });

  it('POST returns 400 for a non-uuid patientTreatmentId', async () => {
    const res = await request(app).post(
      '/api/dashboard/cycle-reminder/not-a-uuid'
    );
    expect(res.status).toBe(400);
  });

  it('POST surfaces the service status code (e.g. 409 cooldown)', async () => {
    const err = new Error('Ya se envió un recordatorio recientemente') as Error & {
      statusCode?: number;
    };
    err.statusCode = 409;
    (dashboardService.sendCycleReminder as jest.Mock).mockRejectedValue(err);

    const res = await request(app).post(
      '/api/dashboard/cycle-reminder/11111111-1111-1111-1111-111111111111'
    );
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest src/routes/dashboard.test.ts`
Expected: FAIL — module `./dashboard.js` not found.

- [ ] **Step 3: Implement the router**

Create `backend/src/routes/dashboard.ts`:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import * as dashboardService from '../services/dashboardService.js';

const router = Router();
const professionalOnly = [authenticate, requireRole('professional')];

function getTenantId(req: Request): string {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    const err = new Error('Forbidden');
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }
  return tenantId;
}

const patientTreatmentIdSchema = z.string().uuid();

// GET /api/dashboard
router.get(
  '/',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const data = await dashboardService.getDashboard(tenantId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/dashboard/cycle-reminder/:patientTreatmentId
router.post(
  '/cycle-reminder/:patientTreatmentId',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const parsed = patientTreatmentIdSchema.safeParse(
        req.params.patientTreatmentId
      );
      if (!parsed.success) {
        const err = new Error('patientTreatmentId must be a valid UUID');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const result = await dashboardService.sendCycleReminder(
        tenantId,
        parsed.data
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
```

- [ ] **Step 4: Mount the router in `app.ts`**

In `backend/src/app.ts`, add the import alongside the other route imports (after line 71's `debtDashboardRoutes` import):

```typescript
import dashboardRoutes from './routes/dashboard.js';
```

And mount it next to the others (after the `debt-dashboard` mount on line 91):

```typescript
app.use('/api/dashboard', dashboardRoutes);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest src/routes/dashboard.test.ts && npx tsc --noEmit`
Expected: PASS (4 tests); no type errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/dashboard.ts backend/src/routes/dashboard.test.ts backend/src/app.ts
git commit -m "feat(dashboard): add GET /api/dashboard and cycle-reminder endpoints"
```

---

## Task 8: Frontend types + API client

**Files:**
- Create: `frontend/src/types/dashboard.ts`
- Create: `frontend/src/lib/dashboardApi.ts`

- [ ] **Step 1: Create the types**

Create `frontend/src/types/dashboard.ts`:

```typescript
export interface CycleAlert {
  patientTreatmentId: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  treatmentName: string;
  nextDueDate: string;
  daysUntilDue: number;
  lastCycleReminderAt: string | null;
}

export interface DashboardAppointment {
  id: string;
  patient_id: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  payment_status: 'unpaid' | 'paid' | 'partial' | 'refunded' | null;
  total_amount_cents: number | null;
  patient_first_name?: string;
  patient_last_name?: string;
}

export interface DashboardKpis {
  todayCount: number;
  confirmedCount: number;
  pendingCount: number;
  todayRevenueCents: number;
}

export interface DashboardDebtSummary {
  totalPendingCents: number;
  patientCount: number;
}

export interface DashboardData {
  todayAppointments: DashboardAppointment[];
  cycleAlerts: { upcoming: CycleAlert[]; overdue: CycleAlert[] };
  kpis: DashboardKpis;
  debtSummary: DashboardDebtSummary;
}
```

- [ ] **Step 2: Create the API client**

Create `frontend/src/lib/dashboardApi.ts`:

```typescript
import api from './api';
import type { DashboardData } from '../types/dashboard';

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await api.get('/dashboard');
  return data;
}

export async function sendCycleReminder(
  patientTreatmentId: string
): Promise<{ status: string }> {
  const { data } = await api.post(
    `/dashboard/cycle-reminder/${patientTreatmentId}`
  );
  return data;
}
```

- [ ] **Step 3: Verify the frontend type-checks**

Run: `cd frontend && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/dashboard.ts frontend/src/lib/dashboardApi.ts
git commit -m "feat(dashboard): frontend types and api client"
```

---

## Task 9: `useDashboard` hook

**Files:**
- Create: `frontend/src/hooks/useDashboard.ts`
- Test: `frontend/src/hooks/useDashboard.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/hooks/useDashboard.test.ts`:

```typescript
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDashboard } from './useDashboard';
import api from '@/lib/api';
import type { DashboardData } from '@/types/dashboard';

vi.mock('@/lib/api');
const mockApi = api as any;

const sample: DashboardData = {
  todayAppointments: [],
  cycleAlerts: { upcoming: [], overdue: [] },
  kpis: {
    todayCount: 0,
    confirmedCount: 0,
    pendingCount: 0,
    todayRevenueCents: 0,
  },
  debtSummary: { totalPendingCents: 0, patientCount: 0 },
};

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches dashboard data on mount', async () => {
    mockApi.get.mockResolvedValue({ data: sample });
    const { result } = renderHook(() => useDashboard());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(sample);
    expect(result.current.error).toBeNull();
    expect(mockApi.get).toHaveBeenCalledWith('/dashboard');
  });

  it('sets an error message when the request fails', async () => {
    mockApi.get.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('No se pudo cargar el panel');
  });

  it('refetches when refetch is called', async () => {
    mockApi.get.mockResolvedValue({ data: sample });
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });
    expect(mockApi.get).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/hooks/useDashboard.test.ts`
Expected: FAIL — cannot find `./useDashboard`.

- [ ] **Step 3: Implement the hook**

Create `frontend/src/hooks/useDashboard.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { fetchDashboard } from '@/lib/dashboardApi';
import type { DashboardData } from '@/types/dashboard';

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchDashboard();
      setData(result);
      setError(null);
    } catch {
      setError('No se pudo cargar el panel');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/hooks/useDashboard.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useDashboard.ts frontend/src/hooks/useDashboard.test.ts
git commit -m "feat(dashboard): useDashboard hook"
```

---

## Task 10: Dashboard panels + page (Layout A)

Presentational components plus the page that composes them in Layout A (cycle alerts full-width on top; today + KPIs row; debt summary footer). The WhatsApp button is shown only when the tenant has the `whatsappIntegration` feature (Gold), mirroring the existing `useSubscription` gating pattern.

**Files:**
- Create: `frontend/src/components/dashboard/CycleAlertsPanel.tsx`
- Create: `frontend/src/components/dashboard/TodayAppointmentsPanel.tsx`
- Create: `frontend/src/components/dashboard/KpisPanel.tsx`
- Create: `frontend/src/components/dashboard/DebtSummaryPanel.tsx`
- Create: `frontend/src/pages/DashboardPage.tsx`
- Test: `frontend/src/pages/__tests__/DashboardPage.test.tsx`

- [ ] **Step 1: Create `KpisPanel`**

Create `frontend/src/components/dashboard/KpisPanel.tsx`:

```tsx
import type { DashboardKpis } from '@/types/dashboard';

function formatArs(cents: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function KpisPanel({ kpis }: { kpis: DashboardKpis }) {
  const items = [
    { label: 'Turnos hoy', value: String(kpis.todayCount) },
    { label: 'Confirmados', value: String(kpis.confirmedCount) },
    { label: 'Pendientes', value: String(kpis.pendingCount) },
    { label: 'Ingresos del día', value: formatArs(kpis.todayRevenueCents) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg border bg-card p-4 text-center"
        >
          <div className="text-2xl font-bold">{it.value}</div>
          <div className="text-xs uppercase text-muted-foreground">
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `TodayAppointmentsPanel`**

Create `frontend/src/components/dashboard/TodayAppointmentsPanel.tsx`:

```tsx
import { Link } from 'react-router-dom';
import type { DashboardAppointment } from '@/types/dashboard';

function formatTime(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export function TodayAppointmentsPanel({
  appointments,
}: {
  appointments: DashboardAppointment[];
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
        Turnos de hoy
      </h2>
      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay turnos para hoy.</p>
      ) : (
        <ul className="divide-y">
          {appointments.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <Link
                to={`/app/appointments/${a.id}`}
                className="text-sm hover:underline"
              >
                {formatTime(a.scheduled_at)} ·{' '}
                {a.patient_first_name ?? ''} {a.patient_last_name ?? ''}
              </Link>
              <span className="text-xs text-muted-foreground">{a.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `DebtSummaryPanel`**

Create `frontend/src/components/dashboard/DebtSummaryPanel.tsx`:

```tsx
import { Link } from 'react-router-dom';
import type { DashboardDebtSummary } from '@/types/dashboard';

function formatArs(cents: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function DebtSummaryPanel({
  summary,
}: {
  summary: DashboardDebtSummary;
}) {
  return (
    <Link
      to="/app/debt-dashboard"
      className="block rounded-lg border bg-card p-4 hover:bg-accent"
    >
      <h2 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">
        Deuda pendiente
      </h2>
      <p className="text-sm">
        <span className="text-lg font-bold">
          {formatArs(summary.totalPendingCents)}
        </span>{' '}
        · {summary.patientCount} paciente
        {summary.patientCount === 1 ? '' : 's'} con saldo →
      </p>
    </Link>
  );
}
```

- [ ] **Step 4: Create `CycleAlertsPanel`**

Create `frontend/src/components/dashboard/CycleAlertsPanel.tsx`:

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import type { CycleAlert } from '@/types/dashboard';
import { sendCycleReminder } from '@/lib/dashboardApi';

interface Props {
  upcoming: CycleAlert[];
  overdue: CycleAlert[];
  canSendWhatsApp: boolean;
  onReminderSent: () => void;
}

function AlertRow({
  alert,
  overdue,
  canSendWhatsApp,
  onReminderSent,
}: {
  alert: CycleAlert;
  overdue: boolean;
  canSendWhatsApp: boolean;
  onReminderSent: () => void;
}) {
  const [sending, setSending] = useState(false);

  const label = overdue
    ? `Vencido hace ${Math.abs(alert.daysUntilDue)} día${
        Math.abs(alert.daysUntilDue) === 1 ? '' : 's'
      }`
    : `Vence en ${alert.daysUntilDue} día${alert.daysUntilDue === 1 ? '' : 's'}`;

  async function handleSend() {
    setSending(true);
    try {
      await sendCycleReminder(alert.patientTreatmentId);
      toast.success(`Recordatorio enviado a ${alert.patientName}`);
      onReminderSent();
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message;
      toast.error(message || 'No se pudo enviar el recordatorio');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className={`flex items-center justify-between rounded-md border-l-4 p-3 ${
        overdue
          ? 'border-l-red-500 bg-red-50 dark:bg-red-950/30'
          : 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/30'
      }`}
    >
      <div className="text-sm">
        <span className="font-medium">{alert.patientName}</span> ·{' '}
        {alert.treatmentName}{' '}
        <span className="text-muted-foreground">— {label}</span>
      </div>
      {canSendWhatsApp && alert.patientPhone && (
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {sending ? 'Enviando…' : 'WhatsApp'}
        </button>
      )}
    </div>
  );
}

export function CycleAlertsPanel({
  upcoming,
  overdue,
  canSendWhatsApp,
  onReminderSent,
}: Props) {
  const empty = upcoming.length === 0 && overdue.length === 0;
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
        Recordatorios de ciclo
      </h2>
      {empty ? (
        <p className="text-sm text-muted-foreground">
          No hay recordatorios pendientes.
        </p>
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-red-600">
                Vencidos
              </div>
              {overdue.map((a) => (
                <AlertRow
                  key={a.patientTreatmentId}
                  alert={a}
                  overdue
                  canSendWhatsApp={canSendWhatsApp}
                  onReminderSent={onReminderSent}
                />
              ))}
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-amber-600">
                Próximos
              </div>
              {upcoming.map((a) => (
                <AlertRow
                  key={a.patientTreatmentId}
                  alert={a}
                  overdue={false}
                  canSendWhatsApp={canSendWhatsApp}
                  onReminderSent={onReminderSent}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `DashboardPage`**

Create `frontend/src/pages/DashboardPage.tsx`:

```tsx
import { useDashboard } from '@/hooks/useDashboard';
import { useSubscription } from '@/hooks/useSubscription';
import { CycleAlertsPanel } from '@/components/dashboard/CycleAlertsPanel';
import { TodayAppointmentsPanel } from '@/components/dashboard/TodayAppointmentsPanel';
import { KpisPanel } from '@/components/dashboard/KpisPanel';
import { DebtSummaryPanel } from '@/components/dashboard/DebtSummaryPanel';

export function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard();
  const { status } = useSubscription();
  const canSendWhatsApp = status?.features?.whatsappIntegration === true;

  if (loading && !data) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando…</div>;
  }
  if (error || !data) {
    return (
      <div className="p-6 text-sm text-red-600">
        {error ?? 'No se pudo cargar el panel.'}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <h1 className="text-xl font-bold">Inicio</h1>

      <CycleAlertsPanel
        upcoming={data.cycleAlerts.upcoming}
        overdue={data.cycleAlerts.overdue}
        canSendWhatsApp={canSendWhatsApp}
        onReminderSent={refetch}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <TodayAppointmentsPanel appointments={data.todayAppointments} />
        <KpisPanel kpis={data.kpis} />
      </div>

      <DebtSummaryPanel summary={data.debtSummary} />
    </div>
  );
}
```

- [ ] **Step 6: Write a smoke render test**

Create `frontend/src/pages/__tests__/DashboardPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { DashboardPage } from '../DashboardPage';
import type { DashboardData } from '@/types/dashboard';

const data: DashboardData = {
  todayAppointments: [],
  cycleAlerts: {
    upcoming: [
      {
        patientTreatmentId: 'pt-1',
        patientId: 'p-1',
        patientName: 'Ana Pérez',
        patientPhone: '+5491100000000',
        treatmentName: 'Botox',
        nextDueDate: '2026-06-15T10:00:00.000Z',
        daysUntilDue: 4,
        lastCycleReminderAt: null,
      },
    ],
    overdue: [],
  },
  kpis: {
    todayCount: 0,
    confirmedCount: 0,
    pendingCount: 0,
    todayRevenueCents: 0,
  },
  debtSummary: { totalPendingCents: 0, patientCount: 0 },
};

vi.mock('@/hooks/useDashboard', () => ({
  useDashboard: () => ({
    data,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ status: { features: { whatsappIntegration: true } } }),
}));

describe('DashboardPage', () => {
  it('renders cycle alerts and section headings', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Recordatorios de ciclo')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run the page test + type-check**

Run: `cd frontend && npx vitest run src/pages/__tests__/DashboardPage.test.tsx && npx tsc --noEmit`
Expected: PASS; no type errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/dashboard frontend/src/pages/DashboardPage.tsx frontend/src/pages/__tests__/DashboardPage.test.tsx
git commit -m "feat(dashboard): dashboard panels and page (Layout A)"
```

---

## Task 11: Wire the route and sidebar

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Register the route and change the index redirect**

In `frontend/src/App.tsx`:

Add the import next to the other page imports:

```typescript
import { DashboardPage } from '@/pages/DashboardPage';
```

Inside the `/app` route children, add the dashboard route (above the `appointments` route) and change the index redirect target from `/app/appointments` to `/app/dashboard`:

```tsx
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="appointments" element={<AppointmentsPage />} />
                {/* ...existing routes... */}
                <Route
                  index
                  element={<Navigate to="/app/dashboard" replace />}
                />
```

- [ ] **Step 2: Add the "Inicio" sidebar item**

In `frontend/src/components/layout/AppLayout.tsx`:

Add `Home` to the lucide import:

```typescript
import {
  Home,
  Calendar,
  Syringe,
  Users,
  BarChart2,
  HelpCircle,
  Settings,
} from 'lucide-react';
```

Prepend an "Inicio" item to BOTH branches of `sidebarItems` (the `appointments === false` branch and the default branch) as the first entry:

```typescript
          { to: '/app/dashboard', label: 'Inicio', icon: Home },
```

- [ ] **Step 3: Verify build/type-check and the full frontend test suite**

Run: `cd frontend && npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/layout/AppLayout.tsx
git commit -m "feat(dashboard): route dashboard as /app home and add sidebar entry"
```

---

## Task 12: Full verification

- [ ] **Step 1: Backend — type-check, lint, full test suite**

Run: `cd backend && npx tsc --noEmit && npm run lint && npm test`
Expected: no type errors; lint clean; all tests PASS.

- [ ] **Step 2: Frontend — type-check + tests**

Run: `cd frontend && npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests PASS.

- [ ] **Step 3: Apply migration and smoke-test the API locally**

Run: `cd backend && npm run db:migrate` then start the dev server (`npm run dev`).
With a valid professional auth token, run:

```bash
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:5001/api/dashboard | jq '{kpis, debtSummary, alerts: (.cycleAlerts.upcoming | length)}'
```

Expected: JSON with `kpis`, `debtSummary`, and a `cycleAlerts` object. Seed a patient with an active treatment whose last appointment + frequency lands within 7 days to see an upcoming alert.

- [ ] **Step 4: Frontend — visual confirmation**

Start the frontend, log in as a professional, and confirm `/app` lands on the dashboard, panels render in Layout A, and (on a Gold tenant) the WhatsApp button appears on alert rows. Use the `superpowers:requesting-code-review` skill if desired before merging.

---

## Notes / Deferred

- **Meta template approval:** `recordatorio_ciclo` must be approved in Meta Business Manager (copy in Task 3, Step 3). Until then, sends fail and are logged; the button still appears for Gold tenants but the send will not deliver. Submit the template as part of rollout.
- **Timezone:** "today" and display times use `America/Argentina/Buenos_Aires`. If the product later supports other regions, make this per-tenant.
- **Out of scope (per spec):** automated cron reminders, precomputed `nextDueAt`, birthdays, an unconfirmed-appointments panel.
