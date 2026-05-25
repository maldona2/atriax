# Mark Appointment Paid at Booking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Impago / Pagado toggle to the new-appointment form so a doctor can mark the appointment paid at booking time without opening the detail sheet.

**Architecture:** Pure frontend UI change in a single component. The backend, hook state shape, default-state value, and POST submit handlers in all three callers (AppointmentsPage, PatientDetailPage, PatientDetailPanel) already wire `form.payment_status` end-to-end. Adding the control surfaces the existing field.

**Tech Stack:** React, TypeScript, Tailwind, shadcn/ui `Button`, `lucide-react` icons, vitest + @testing-library/react.

**Spec:** [`docs/superpowers/specs/2026-05-25-paid-at-booking-design.md`](../specs/2026-05-25-paid-at-booking-design.md)

---

## Task 1: Add Impago/Pagado toggle to NewAppointmentSheet

**Files:**
- Modify: `frontend/src/components/appointments/NewAppointmentSheet.tsx`

This is the only code change required. The control sits between the Treatments block (ends at line 399) and the Notes block (begins at line 401 in the current file). It reads from `form.payment_status` and writes to it via `setForm`, then the existing submit handlers in the parent pages forward the value to the API.

- [ ] **Step 1: Add imports**

In `frontend/src/components/appointments/NewAppointmentSheet.tsx`, extend the existing `lucide-react` import (around line 4) by adding `Wallet`:

```tsx
import {
  CalendarIcon,
  Clock,
  FileText,
  Plus,
  User,
  Syringe,
  Trash2,
  History,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Wallet,
} from 'lucide-react';
```

Then add a single import for `paymentConfig` next to the other local component imports (after the `SuggestedDateIndicator` import, around line 48):

```tsx
import { paymentConfig } from './constants';
```

`cn` and `Button` are already imported in the file — do not re-import them.

- [ ] **Step 2: Insert the toggle block**

Locate the closing `</div>` of the Treatments block. In the current file it ends on the line just before the comment `{/* Notes */}` (around line 400). Insert the following block **immediately before** `{/* Notes */}`:

```tsx
            {/* Payment status */}
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
                        'h-10 rounded-lg sm:h-12',
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

Indentation must match the surrounding sibling blocks (12 spaces of leading whitespace at the outer `<div>`). Do not modify any other block.

- [ ] **Step 3: Typecheck and lint**

Run:

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output (clean exit).

Run:

```bash
cd frontend && npx eslint src/components/appointments/NewAppointmentSheet.tsx
```

Expected: no errors.

If either fails, the most likely cause is indentation drift or a missing import — re-check Step 1 and Step 2.

- [ ] **Step 4: Manual smoke test**

Start the frontend dev server (use the project's standard command, e.g. `cd frontend && npm run dev`). In a browser:

1. Open the appointments page and click to create a new appointment.
2. Confirm a section labeled **Estado de pago** appears between **Tratamientos** and **Notas**, with two buttons: **Impago** and **Pagado**.
3. Confirm **Impago** is highlighted by default (amber background per `paymentConfig.unpaid.className`).
4. Click **Pagado**. The emerald highlight should move to **Pagado** and **Impago** should revert to the outline style.
5. Fill in the rest of the required fields (patient, date, time) and submit.
6. Re-open the created appointment from the calendar. In the detail sheet, confirm the payment status reads **Pagado**.
7. Repeat the create flow but leave the default **Impago**. Submit. Confirm the new appointment shows **Impago** in the detail sheet.
8. Repeat once more from `PatientDetailPanel` (open a patient, create an appointment from there) and `PatientDetailPage` to confirm all three parent pages forward `payment_status` correctly.

If any step fails, see Troubleshooting below.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/appointments/NewAppointmentSheet.tsx
git commit -m "feat(appointments): allow marking new appointment as paid at booking

Adds an Impago/Pagado toggle to the new-appointment form, between
Tratamientos and Notas. Reuses paymentConfig for label and color so
the active state matches the detail sheet. Backend and submit handlers
already accepted payment_status; this surfaces the existing field."
```

---

## Troubleshooting

**The toggle does not appear.** Confirm the JSX block was inserted inside the `<ScrollArea>` content area, at the same indentation level as the `{/* Treatments */}` and `{/* Notes */}` blocks. If it was inserted outside the form or `ScrollArea`, it will either fail to render or break the form layout.

**Clicking a button submits the form.** The `<Button>` is missing `type="button"`. Re-check Step 2 — every button inside the `<form>` must specify `type="button"` to avoid implicit submit.

**Default state shows neither button highlighted.** `form.payment_status` is `undefined` and the `?? 'unpaid'` fallback is missing from the `active` comparison. Re-check the snippet in Step 2.

**Created appointment shows as Impago even after clicking Pagado.** Verify in browser devtools that the POST `/appointments` request body includes `"payment_status": "paid"`. If it doesn't, the parent page's submit handler is stale — confirm you are on `main` at or after commit `cb5af93` (all three parent pages already include `payment_status: form.payment_status ?? 'unpaid'` in their POST body).

**Tests fail unrelated to this change.** Pre-existing failure in `src/jobs/reminderJob.test.ts` on the backend is unrelated and tracked separately. Do not attempt to fix it as part of this plan.
