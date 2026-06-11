# Dashboard / Home — Design

**Date:** 2026-06-11
**Status:** Approved (brainstorm)
**Branch context:** built on top of current work in this repo

## Goal

Add a home/dashboard screen at `/app/dashboard` that becomes the default landing
route for `/app` (replacing today's redirect to `/app/appointments`). It surfaces,
in priority order (Layout A):

1. **Cycle alerts** (full-width, top): patients on an ongoing treatment whose next
   visit is approaching or overdue, with a one-click WhatsApp reminder.
2. **Today's appointments** + **Quick KPIs** (one row).
3. **Debt summary** (footer, links to the existing `DebtDashboard`).

The dashboard is the central daily view for a professional: who to contact, what's
on today, and the headline numbers.

## Non-goals (YAGNI)

- Automated/scheduled cycle reminders (cron). This is doctor-initiated only.
- Precomputing/storing `nextDueAt` on a schedule.
- Birthday panel.
- A dedicated "unconfirmed appointments" panel.

These can be layered on later; the design leaves room for them.

## Cycle-alert logic (core)

A pure, unit-tested helper computes the next expected visit date for an active
patient treatment:

```
computeNextDueDate(patientTreatment, treatment, lastAppointment) -> Date | null
```

- **Phase:** if `currentSession <= treatment.initialSessionsCount` → *initial*
  phase, use `treatment.initialFrequencyWeeks`. Otherwise → *maintenance* phase,
  use `treatment.maintenanceFrequencyWeeks`.
- **Base date:** `lastAppointment.scheduledAt` if a last appointment exists;
  otherwise `patientTreatment.startedAt`.
- **nextDueDate** = base date + (frequencyWeeks × 7 days).
- **Skip (return null):** treatment whose applicable frequency is null/0 — cannot
  compute. These never produce an alert.

Classification (in `dashboardService`):

- **Upcoming alert:** `nextDueDate` falls within `[today, today + windowDays]`
  **and** the patient has no future non-cancelled appointment.
- **Overdue alert:** `nextDueDate < today` **and** no future non-cancelled
  appointment **and** `patientTreatment.isActive`.
- "No future appointment" = patient has zero appointments with `scheduledAt >= now`
  and `status != 'cancelled'`. If the patient already has a turno coming up, no
  nudge is shown (any treatment).
- `windowDays` is configurable via env `CYCLE_ALERT_WINDOW_DAYS` (default `7`).

### Anti-spam / cooldown

- New column `lastCycleReminderAt timestamptz` on `patientTreatments` (the only
  schema change — a minimal migration, not full precompute).
- After a reminder is sent, set `lastCycleReminderAt = now()`.
- An alert whose `lastCycleReminderAt` is within `CYCLE_REMINDER_COOLDOWN_DAYS`
  (default `14`) is suppressed from the list (or shown as "reminder sent" if still
  in the same day — UI detail). Prevents nagging the same patient repeatedly.

## WhatsApp action (one-click)

- Each alert row has an "Enviar recordatorio" (Send reminder) button →
  `POST /api/dashboard/cycle-reminder/:patientTreatmentId`.
- Backend adds `WhatsAppNotificationService.sendCycleReminder(phone, data)` using a
  **new Meta template** `recordatorio_ciclo` (locale `es_AR`).
  - Body params: patient name, treatment name, professional name, clinic/consultorio
    name. (Final param order locked when the template copy is written for Meta
    submission.)
- **Meta approval dependency:** `recordatorio_ciclo` must be approved by Meta before
  real sends succeed. Until then, sends fail and are logged (consistent with the
  existing fire-and-forget pattern). The button is gated behind
  `FEATURE_WHATSAPP_ENABLED` **and** the gold plan, exactly like the current
  WhatsApp features. Without gold, the button is hidden/disabled.
- The outbound message is logged in the existing `whatsappMessages` table by the
  existing send path.
- On a successful send, the endpoint sets `lastCycleReminderAt` on the
  patient treatment (see cooldown above).

## Architecture

### Backend

- **Endpoint:** `GET /api/dashboard` (authenticated, professional role) →
  `dashboardService.getDashboard(tenantId)` returns:
  ```
  {
    todayAppointments: [...],          // today's appts with patient + status + payment
    cycleAlerts: { upcoming: [...], overdue: [...] },
    kpis: { todayCount, confirmedCount, pendingCount, todayRevenueCents },
    debtSummary: { totalPendingCents, patientCount }
  }
  ```
- **`dashboardService`** orchestrates efficient Drizzle queries (joins, no N+1) and
  reuses existing services where natural (`appointmentService`,
  `patientTreatmentService`, debt-dashboard query). The cycle-alert computation uses
  the `computeNextDueDate` helper over a single joined query of active patient
  treatments + their treatment row + last appointment.
- **Endpoint:** `POST /api/dashboard/cycle-reminder/:patientTreatmentId` — sends the
  WhatsApp cycle reminder (gating + cooldown as above), sets `lastCycleReminderAt`.
- New route file `routes/dashboard.ts`, mounted at `/api/dashboard` in `app.ts`.
- Computation done on-the-fly (Approach 1). If scale grows, migrating to a
  precomputed `nextDueAt` + cron is a localized change.

### Frontend

- `pages/DashboardPage.tsx`, rendered under `AppLayout`.
- `/app` index route → redirect to `/app/dashboard` (was `/app/appointments`).
- `hooks/useDashboard.ts` — axios `GET /api/dashboard`, loading/error state, manual
  refresh after sending a reminder.
- `components/dashboard/`: `CycleAlertsPanel`, `TodayAppointmentsPanel`,
  `KpisPanel`, `DebtSummaryPanel`. Cycle alert rows render the WhatsApp button,
  which calls the reminder endpoint and refreshes on success.
- Sidebar nav: add an "Inicio" item at the top of `AppLayout`.
- WhatsApp button visibility follows the existing subscription/feature-flag pattern
  used elsewhere in the app.

## Testing

- **Unit — `computeNextDueDate`:** initial vs maintenance phase boundary
  (`currentSession` == `initialSessionsCount`), no last appointment (falls back to
  `startedAt`), null/zero frequency → null, window edges (exactly today, exactly
  today+window), overdue vs upcoming.
- **Unit — `dashboardService`** (mocked repos): upcoming/overdue classification,
  exclusion when a future appointment exists, cooldown suppression, KPI and debt
  aggregation.
- **Endpoint — cycle-reminder:** gold-plan gating (rejected without gold),
  feature-flag off path, cooldown enforcement, `lastCycleReminderAt` set on success.
- Follow existing service-layer testing conventions in the repo.

## Open items to confirm at implementation time

- Exact `recordatorio_ciclo` template copy + final param order (needed for Meta
  submission).
- Whether `todayRevenueCents` counts only `completed`/paid appointments or all
  scheduled-today (default: paid/completed).
