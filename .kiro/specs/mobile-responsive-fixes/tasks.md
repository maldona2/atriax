# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Mobile Layout Broken Classes
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate each broken layout
  - **Scoped PBT Approach**: Scope to the concrete failing cases — the exact class strings that cause mobile breakage
  - Test 1 — LandingHeader unauthenticated: render the component and assert the "Iniciar sesión" `<Button>` does NOT have `hidden` in its className (isBugCondition: component='LandingHeader', viewportWidth<640, loginButtonHasClass('hidden sm:inline-flex'))
  - Test 2 — DataTable: render the component and assert the `<div className="rounded-md border">` wrapper DOES have `overflow-x-auto` in its className (isBugCondition: tableWrapperLacksClass('overflow-x-auto'))
  - Test 3 — AppointmentDetailSheet date/time grid: render and assert the date/time grid div does NOT have bare `grid-cols-2` without a responsive prefix (isBugCondition: dateTimeGridHasClass('grid-cols-2') without sm: prefix)
  - Test 4 — AppointmentDetailSheet status grid: render and assert the status change grid div does NOT have bare `grid-cols-2` without a responsive prefix
  - Test 5 — AppointmentDetailSheet payment buttons: render and assert each payment button has `flex-1` in its className
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found (e.g., "Iniciar sesión button has class 'hidden sm:inline-flex'", "table wrapper missing overflow-x-auto", "grids use bare grid-cols-2")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Desktop Layout and Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology — observe unfixed code behavior for non-buggy inputs first
  - Observe: LandingHeader authenticated branch renders "Ir al panel" button with `hidden sm:inline-flex` (intentional — must stay)
  - Observe: DataTable renders with `rounded-md border` div, pagination, floatingBar, and pdfTable mode intact
  - Observe: AppointmentDetailSheet at desktop viewport has `sm:grid-cols-2` on both grids and natural-sized payment buttons
  - Observe: clicking payment buttons calls `handlePaymentChange`; clicking status buttons calls `handleStatusChange`
  - Write property-based test: for any authenticated render of LandingHeader, the "Ir al panel" button retains `hidden sm:inline-flex`
  - Write property-based test: for any DataTable render, `rounded-md border` class is still present on the wrapper div (overflow-x-auto is additive, not replacing)
  - Write property-based test: for any AppointmentDetailSheet render, both grids contain `sm:grid-cols-2` (desktop column preserved)
  - Write property-based test: for any AppointmentDetailSheet render, payment button click handlers fire `handlePaymentChange` with the correct PaymentStatus key
  - Write property-based test: for any AppointmentDetailSheet render, status button click handlers fire `handleStatusChange` with the correct status key
  - Verify all tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Apply mobile responsive fixes

  - [x] 3.1 Fix LandingHeader — show login button on mobile
    - File: `frontend/src/components/landing/LandingHeader.tsx`
    - In the unauthenticated branch, find the "Iniciar sesión" Button: `className="hidden sm:inline-flex"`
    - Change to: `className="inline-flex"` (remove `hidden sm:inline-flex`, keep only `inline-flex` or remove className override entirely since Button defaults work)
    - The authenticated "Ir al panel" Button keeps its `hidden sm:inline-flex` — do NOT touch it
    - _Bug_Condition: isBugCondition({ component: 'LandingHeader', viewportWidth < 640 }) — loginButtonHasClass('hidden sm:inline-flex')_
    - _Expected_Behavior: "Iniciar sesión" button visible at all viewport widths_
    - _Preservation: authenticated "Ir al panel" button retains hidden sm:inline-flex; desktop layout unchanged_
    - _Requirements: 2.1, 3.1_

  - [x] 3.2 Fix DataTable — add horizontal scroll to table wrapper
    - File: `frontend/src/components/data-table/data-table.tsx`
    - Find: `<div className="rounded-md border">`
    - Replace with: `<div className="overflow-x-auto rounded-md border">`
    - No other changes to the component
    - _Bug_Condition: isBugCondition({ component: 'DataTable', viewportWidth < tableContentWidth }) — tableWrapperLacksClass('overflow-x-auto')_
    - _Expected_Behavior: table container scrolls horizontally instead of overflowing viewport_
    - _Preservation: border, pagination, floatingBar, pdfTable mode, row selection all unchanged_
    - _Requirements: 2.2, 3.2_

  - [x] 3.3 Fix AppointmentDetailSheet — responsive grids and payment buttons
    - File: `frontend/src/components/appointments/AppointmentDetailSheet.tsx`
    - Change 1 — date/time grid: find `<div className="grid grid-cols-2 gap-3">` (the date/time cards section) → replace with `<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">`
    - Change 2 — payment buttons: in the `paymentConfig` map, add `flex-1 sm:flex-none` to each Button's className: `className={cn('h-9 flex-1 sm:flex-none', activePayment === key && cfg.className)}`
    - Change 3 — status change grid: find `<div className="grid grid-cols-2 gap-2">` (the "Cambiar estado" section) → replace with `<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">`
    - Bottom action buttons (`h-11 flex-1`) are already correct — do NOT change them
    - _Bug_Condition: isBugCondition({ component: 'AppointmentDetailSheet', viewportWidth < 640 }) — dateTimeGridHasClass('grid-cols-2') OR statusGridHasClass('grid-cols-2') OR paymentButtonsLackClass('flex-1 sm:flex-none')_
    - _Expected_Behavior: grids stack to single column on mobile; payment buttons fill row width on mobile_
    - _Preservation: sm:grid-cols-2 restores 2-column layout at 640px+; click handlers and API calls unchanged_
    - _Requirements: 2.3, 2.4, 2.5, 3.3, 3.4_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Mobile Layout Broken Classes
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior (correct classes present)
    - When these tests pass, it confirms all five bug conditions are resolved
    - Run bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: All 5 tests PASS (confirms bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Desktop Layout and Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions)
    - Confirm authenticated "Ir al panel" button still has `hidden sm:inline-flex`
    - Confirm DataTable wrapper still has `rounded-md border` alongside new `overflow-x-auto`
    - Confirm both grids have `sm:grid-cols-2` for desktop layout
    - Confirm click handlers fire correctly

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite for the affected components
  - Ensure all 5 bug condition tests pass (fix confirmed)
  - Ensure all preservation tests pass (no regressions)
  - Ask the user if any questions arise
