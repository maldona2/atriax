# Mobile Responsive Fixes — Bugfix Design

## Overview

Three mobile UX bugs affect the Atriax frontend on small screens (viewport < 640px):

1. **LandingHeader**: The "Iniciar sesión" button is hidden on mobile via `hidden sm:inline-flex`, leaving only "Prueba gratis" visible. Fix: remove the `hidden sm:inline-flex` classes so the button is always visible.
2. **DataTable**: The `<div className="rounded-md border">` wrapping the `<Table>` has no horizontal scroll, causing the table to overflow the viewport. Fix: add `overflow-x-auto` to that div.
3. **AppointmentDetailSheet**: Multiple layout sections use fixed `grid-cols-2` or unsized buttons that are cramped on narrow screens. Fix: switch to `grid-cols-1 sm:grid-cols-2` for grids and add `flex-1 sm:flex-none` to payment buttons.

All fixes are purely CSS/Tailwind class changes — no logic, state, or API behavior is altered.

## Glossary

- **Bug_Condition (C)**: The set of rendering conditions (viewport width + component rendered) that trigger a broken mobile layout.
- **Property (P)**: The desired visual/interactive behavior on mobile — elements are visible, scrollable, and comfortably sized.
- **Preservation**: Desktop layout (viewport ≥ 640px) and all interactive behavior (clicks, API calls, navigation) must remain identical after the fix.
- **`hidden sm:inline-flex`**: Tailwind utility combination that hides an element on mobile and shows it as `inline-flex` at the `sm` breakpoint (640px+).
- **`overflow-x-auto`**: Tailwind utility that enables horizontal scrolling on a container when its content overflows.
- **`grid-cols-1 sm:grid-cols-2`**: Tailwind responsive grid — single column on mobile, two columns at `sm` breakpoint.
- **`flex-1 sm:flex-none`**: Tailwind responsive flex sizing — button grows to fill available space on mobile, natural size on desktop.

## Bug Details

### Bug Condition

The bugs manifest when the viewport is narrower than 640px and the affected components are rendered. The root issue in each case is a hardcoded Tailwind class that ignores the mobile viewport.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input = { component: string, viewportWidth: number }
  OUTPUT: boolean

  IF input.component = 'LandingHeader' AND input.viewportWidth < 640
    RETURN loginButtonHasClass('hidden sm:inline-flex')
  END IF

  IF input.component = 'DataTable' AND input.viewportWidth < tableContentWidth
    RETURN tableWrapperLacksClass('overflow-x-auto')
  END IF

  IF input.component = 'AppointmentDetailSheet' AND input.viewportWidth < 640
    RETURN dateTimeGridHasClass('grid-cols-2')
           OR statusGridHasClass('grid-cols-2')
           OR paymentButtonsLackClass('flex-1 sm:flex-none')
  END IF

  RETURN false
END FUNCTION
```

### Examples

- **Bug 1**: On a 375px-wide iPhone, the LandingHeader renders only "Prueba gratis". "Iniciar sesión" is invisible. Expected: both buttons visible.
- **Bug 2**: On a 390px-wide device, the Patients table extends ~1200px wide with no scroll handle. Expected: container scrolls horizontally.
- **Bug 3a**: On a 375px device, the date card and time card in AppointmentDetailSheet are squeezed into two 160px columns. Expected: each card takes full width (stacked).
- **Bug 3b**: On a 375px device, the four payment status buttons ("Impago", "Pagado", "Parcial", "Reembolsado") wrap but each button is only as wide as its label. Expected: buttons stretch to fill the row.
- **Bug 3c**: On a 375px device, the status change grid shows 4 buttons in 2 columns at ~160px each — too narrow for the label + dot. Expected: single column on mobile.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- On desktop (viewport ≥ 640px), LandingHeader continues to show both buttons side by side with identical styling.
- DataTable border, pagination, row selection, floating bar, and `pdfTable` mode remain unchanged on all screen sizes.
- AppointmentDetailSheet date/time cards display side by side (`grid-cols-2`) on tablet and desktop.
- All payment status button click handlers continue to fire `handlePaymentChange` and update state/API identically.
- All appointment status button click handlers continue to fire `handleStatusChange` identically.
- "Cerrar" and "Ver paciente" buttons continue to close the sheet and navigate to the patient page.

**Scope:**
All inputs that do NOT involve a narrow mobile viewport (< 640px) are completely unaffected. This includes:
- Any interaction on a desktop or tablet screen
- Mouse clicks, keyboard navigation, and touch events on buttons
- API calls triggered by status/payment changes
- React Router navigation from "Ver paciente"

## Hypothesized Root Cause

1. **Hardcoded visibility class (Bug 1)**: The `Button` for "Iniciar sesión" has `className="hidden sm:inline-flex"`. This was intentional to save header space on mobile, but the requirement is now to show it on all sizes. The fix is simply removing those two classes.

2. **Missing scroll container (Bug 2)**: The `<div className="rounded-md border">` in `DataTable` has no overflow handling. When the table's column widths exceed the viewport, the div clips or overflows the page. Adding `overflow-x-auto` makes the div scroll instead.

3. **Fixed grid columns (Bug 3a, 3c)**: `grid-cols-2` in AppointmentDetailSheet is applied unconditionally. On narrow screens the two columns are too small. Changing to `grid-cols-1 sm:grid-cols-2` stacks them on mobile and restores the two-column layout at 640px+.

4. **Unsized flex buttons (Bug 3b)**: Payment buttons use `flex flex-wrap gap-2` on the container but individual buttons have no width constraint. On mobile they wrap but remain narrow. Adding `flex-1 sm:flex-none` makes each button expand to fill its row on mobile while keeping natural sizing on desktop.

## Correctness Properties

Property 1: Bug Condition — Mobile Elements Are Visible and Usable

_For any_ render where the bug condition holds (isBugCondition returns true), the fixed components SHALL display all interactive elements visibly and with adequate sizing: the login button is visible in LandingHeader, the DataTable container scrolls horizontally, and AppointmentDetailSheet grids and buttons adapt to single-column / full-width layouts on narrow viewports.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation — Desktop Layout and Behavior Unchanged

_For any_ render where the bug condition does NOT hold (isBugCondition returns false — desktop viewport or unaffected component), the fixed components SHALL produce exactly the same rendered output and interactive behavior as the original components, preserving all desktop layouts, click handlers, API calls, and navigation.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `frontend/src/components/landing/LandingHeader.tsx`

**Change 1 — Remove hidden class from login button:**
- Find: `className="hidden sm:inline-flex"`
- Replace with: `className="inline-flex"` (or simply remove the className override and rely on Button defaults, but keeping `size="sm"` and `variant="ghost"` is sufficient)
- Only the unauthenticated branch's "Iniciar sesión" button is affected. The authenticated "Ir al panel" ghost button intentionally keeps `hidden sm:inline-flex` since the dropdown menu covers that case on mobile.

---

**File**: `frontend/src/components/data-table/data-table.tsx`

**Change 2 — Add overflow-x-auto to table wrapper:**
- Find: `<div className="rounded-md border">`
- Replace with: `<div className="overflow-x-auto rounded-md border">`

---

**File**: `frontend/src/components/appointments/AppointmentDetailSheet.tsx`

**Change 3 — Date/time grid responsive columns:**
- Find: `<div className="grid grid-cols-2 gap-3">`
- Replace with: `<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">`

**Change 4 — Payment buttons responsive sizing:**
- Find each `<Button ... className={cn('h-9', ...)}>`  inside the payment map
- Add `flex-1 sm:flex-none` to the className so buttons fill the row on mobile

**Change 5 — Status change grid responsive columns:**
- Find: `<div className="grid grid-cols-2 gap-2">`  (the status change section)
- Replace with: `<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">`

## Testing Strategy

### Validation Approach

Two-phase approach: first run exploratory tests on the unfixed code to confirm the bug manifests as expected, then verify the fix resolves all bug conditions while preserving desktop behavior.

Because these are pure CSS/Tailwind class changes with no logic, the primary testing mechanism is component rendering tests that assert class presence/absence and visual layout at different viewport widths.

### Exploratory Bug Condition Checking

**Goal**: Confirm the bug manifests on unfixed code before applying the fix. Surface counterexamples that demonstrate each broken layout.

**Test Plan**: Render each component at a 375px viewport width and assert the broken state exists. These tests WILL FAIL on unfixed code (that is the point — they confirm the bug).

**Test Cases**:
1. **Login button hidden on mobile**: Render `LandingHeader` (unauthenticated) at 375px — assert the "Iniciar sesión" button has `hidden` class (will pass on unfixed, fail after fix — used as exploration).
2. **Table overflow on mobile**: Render `DataTable` with wide columns at 375px — assert the table wrapper div does NOT have `overflow-x-auto` (confirms bug).
3. **Date grid cramped on mobile**: Render `AppointmentDetailSheet` at 375px — assert the date/time grid has `grid-cols-2` without responsive prefix (confirms bug).
4. **Status grid cramped on mobile**: Render `AppointmentDetailSheet` at 375px — assert the status change grid has `grid-cols-2` without responsive prefix (confirms bug).

**Expected Counterexamples**:
- "Iniciar sesión" button is not rendered / has `display: none` on mobile
- Table wrapper div overflows without scroll
- Grid containers use fixed 2-column layout regardless of viewport

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed components produce the expected behavior.

**Pseudocode:**
```
FOR ALL render WHERE isBugCondition(render) DO
  result := renderFixed(render)
  ASSERT expectedBehavior(result)
END FOR
```

**Test Cases**:
1. Render fixed `LandingHeader` (unauthenticated) — assert "Iniciar sesión" button does NOT have `hidden` class.
2. Render fixed `DataTable` — assert wrapper div has `overflow-x-auto` class.
3. Render fixed `AppointmentDetailSheet` — assert date/time grid has `grid-cols-1` (mobile-first) class.
4. Render fixed `AppointmentDetailSheet` — assert status grid has `grid-cols-1` (mobile-first) class.
5. Render fixed `AppointmentDetailSheet` — assert payment buttons have `flex-1` class.

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed components produce the same result as the original.

**Pseudocode:**
```
FOR ALL render WHERE NOT isBugCondition(render) DO
  ASSERT originalComponent(render) = fixedComponent(render)
END FOR
```

**Testing Approach**: Property-based testing is well-suited here because:
- It generates many viewport/prop combinations automatically
- It catches regressions in desktop layout that manual tests might miss
- It provides strong guarantees that non-mobile behavior is unchanged

**Test Cases**:
1. **Desktop login button preservation**: Render fixed `LandingHeader` at 1024px — assert both buttons are present and "Iniciar sesión" has no `hidden` class.
2. **DataTable desktop layout preservation**: Render fixed `DataTable` with various column counts — assert border, pagination, and row structure are unchanged.
3. **AppointmentDetailSheet desktop grid**: Render at 768px+ — assert date/time grid has `sm:grid-cols-2` and status grid has `sm:grid-cols-2`.
4. **Click handler preservation**: Simulate clicking payment/status buttons — assert `handlePaymentChange` / `handleStatusChange` are called with correct arguments.
5. **Navigation preservation**: Simulate clicking "Ver paciente" — assert navigation to `/app/patients/:id` occurs.

### Unit Tests

- Assert class presence/absence on each fixed element at mobile viewport width
- Assert "Iniciar sesión" button renders in the unauthenticated branch
- Assert `overflow-x-auto` is on the DataTable wrapper div
- Assert `grid-cols-1 sm:grid-cols-2` on both grids in AppointmentDetailSheet
- Assert `flex-1 sm:flex-none` on payment buttons

### Property-Based Tests

- Generate random viewport widths (320–1920px) and assert: below 640px grids are single-column, at/above 640px grids are two-column
- Generate random sets of payment statuses and assert button click handlers fire correctly regardless of viewport
- Generate random appointment data and assert AppointmentDetailSheet renders without overflow at any viewport width

### Integration Tests

- Full render of landing page at 375px — both header buttons visible and clickable
- Full render of Patients page at 375px — table scrolls horizontally, pagination works
- Full render of AppointmentDetailSheet at 375px — all sections stack correctly, status/payment changes work end-to-end
- Full render of AppointmentDetailSheet at 1024px — layout matches pre-fix desktop layout exactly
