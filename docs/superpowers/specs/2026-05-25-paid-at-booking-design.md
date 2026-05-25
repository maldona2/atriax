# Mark Appointment as Paid at Booking Time

**Date:** 2026-05-25
**Status:** Approved
**Scope:** Frontend UI only

## Problem

When a doctor creates a new appointment in the app, the system always saves it with `payment_status = 'unpaid'`. To mark it as paid, the doctor must:

1. Create the appointment
2. Open the appointment detail sheet
3. Toggle the payment status to "paid"

For appointments where the patient pays upfront at booking time, this is two extra steps. Doctors want to mark the appointment as paid directly from the new-appointment form.

## Goal

Add a payment-status toggle to the `NewAppointmentSheet` so the doctor can select **Pagado** or **No pagado** before submitting. The selection persists to `payment_status` on the new appointment row.

## Non-goals

- Partial-payment workflow (entering an exact amount paid) — out of scope.
- Refunded status at creation time — does not apply to a fresh appointment.
- Notifications including payment status — unchanged.
- Backend/schema changes — already supported.

## Architecture

### Backend (no changes)

The backend already accepts `payment_status` at creation:

- `CreateAppointmentInput.payment_status?: PaymentStatus` — defined in [appointmentService.ts:118](backend/src/services/appointmentService.ts:118).
- `create()` reads input and defaults to `'unpaid'` if absent — [appointmentService.ts:498](backend/src/services/appointmentService.ts:498).
- `PaymentStatus` enum: `'unpaid' | 'paid' | 'partial' | 'refunded'`.
- Zod validation on POST `/appointments` already in place.

### Frontend hook (no changes)

- `AppointmentFormData.payment_status?: 'unpaid' | 'paid' | 'partial' | 'refunded'` — already exists in `useAppointments.ts:16`.
- Initial state in `constants.ts:76` defaults to `payment_status: 'unpaid'`.

### Frontend UI (single file change)

Add a new section to [NewAppointmentSheet.tsx](frontend/src/components/appointments/NewAppointmentSheet.tsx) between the Treatments block and the Notes block (after line 399, before line 401).

## UI specification

### Layout

A new bordered field block, styled consistently with adjacent fields (Hora, Duración). Labels come from `paymentConfig` (`Impago` / `Pagado`).

```
┌─ 💵 Estado de pago ──────────────┐
│  [ Impago ]      [ Pagado ]     │
└──────────────────────────────────┘
```

### Markup pattern

```tsx
<div className="space-y-2">
  <label className="flex items-center gap-2 text-sm font-medium">
    <Wallet className="h-4 w-4 text-primary" />
    Estado de pago
  </label>
  <div className="grid grid-cols-2 gap-2">
    {(['unpaid', 'paid'] as const).map((key) => {
      const cfg = paymentConfig[key];
      const active = (form.payment_status ?? 'unpaid') === key;
      return (
        <Button
          key={key}
          type="button"
          variant={active ? 'default' : 'outline'}
          className={cn(
            'h-10 sm:h-12 rounded-lg',
            active && cfg.className
          )}
          onClick={() =>
            setForm((f) => ({ ...f, payment_status: key }))
          }
        >
          {cfg.label}
        </Button>
      );
    })}
  </div>
</div>
```

### Visual states

- **Default state:** form initializes with `payment_status: 'unpaid'`. The `Impago` button is the active one (`variant="default"` + amber `paymentConfig.unpaid.className`). The `Pagado` button is `outline`.
- **After clicking Pagado:** `Pagado` becomes active (`variant="default"` + emerald `paymentConfig.paid.className`); `Impago` reverts to `outline`.
- Reuses the existing `paymentConfig` map from [constants.ts](frontend/src/components/appointments/constants.ts) — single source of truth for label and color. Only the `unpaid` and `paid` entries are rendered; `partial` and `refunded` are filtered out.

### Icon

`Wallet` from `lucide-react` (already used elsewhere in the appointment domain). Import alongside existing icons in the file.

## Data flow

1. Form opens. State seeded from `constants.ts` default → `payment_status: 'unpaid'`.
2. Doctor clicks **Pagado**. `setForm` updates `payment_status: 'paid'`.
3. Submit handler posts the existing `AppointmentFormData` to `POST /appointments`.
4. Backend `create()` persists `paymentStatus: 'paid'` on the new row.
5. Detail panel renders the new appointment with the paid badge.

No new API calls, no new endpoints, no schema migrations.

## Edge cases

| Case | Behavior |
|------|----------|
| No treatments selected, marked paid | Saves `payment_status: 'paid'`, `totalAmountCents: null`. Allowed — covers consults without itemized treatments. |
| Marked paid then form cancelled before submit | No persistence (form state only). |
| Appointment later cancelled | Existing `update()` clears `paymentStatus` to `null` when status → `cancelled` ([appointmentService.ts:640](backend/src/services/appointmentService.ts:640)). Unchanged. |
| Patient-initiated appointment (not from doctor UI) | Out of scope — this form is for the doctor's create flow only. |

## Testing

- **Manual smoke:**
  1. Open new appointment sheet.
  2. Verify default = `Impago` highlighted.
  3. Click `Pagado` → buttons toggle (active state swaps).
  4. Submit form.
  5. Open the just-created appointment → confirm payment badge shows `Pagado`.
- **Unit tests:** none required. The toggle is presentational state; backend persistence path is already covered.
- **Regression check:** existing appointments created without explicit `payment_status` continue to default to `unpaid` (no behavioral change for omitted field).

## Out of scope / future work

- A partial-payment input (amount + currency) at booking.
- Wiring `payment_status` into WhatsApp/email confirmation messages.
- Bulk-marking historical appointments paid from a list view.

## Files touched

- `frontend/src/components/appointments/NewAppointmentSheet.tsx` (add UI block, import `Wallet` + `paymentConfig` + `cn`)

No other files. No backend touch. No tests required.
