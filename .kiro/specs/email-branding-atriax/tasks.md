# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - AnamnesIA Brand Name in Three Locations
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists in all three locations
  - **Scoped PBT Approach**: Scope the property to the three concrete failing locations (deterministic bug)
  - Test 1 — Default sender: read the `RESEND_FROM` constant without env var set, assert it contains `"Atriax"` (not `"AnamnesIA"`)
  - Test 2 — Calendar source title: call `eventFormatter.formatEvent(...)`, assert `result.source.title === 'Atriax'`
  - Test 3 — ICS PRODID: call `generateICS(...)`, assert output contains `'PRODID:-//Atriax//Appointment Calendar//ES'`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: All three tests FAIL with `"AnamnesIA"` in output (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., `"AnamnesIA <noreply@anamnesia.pro>"`, `source.title = "AnamnesIA"`, `PRODID:-//AnamnesIA//...`)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Domain and Non-Brand Strings Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `generateUID(someUUID)` returns `appointment-{id}@anamnesia.pro` on unfixed code
  - Observe: ICS organizer field uses `noreply@anamnesia.pro` on unfixed code
  - Observe: when `RESEND_FROM` env var is set, the configured value is used as-is on unfixed code
  - Write property-based test: for many random UUIDs, `generateUID` always returns `appointment-{id}@anamnesia.pro` (domain preserved)
  - Write property-based test: for many random professional names, ICS organizer email is always `noreply@anamnesia.pro`
  - Write unit test: when `RESEND_FROM` is set, the configured value is used unchanged
  - Write unit test: ICS output does NOT contain `"AnamnesIA"` anywhere after fix (but verify domain strings like `anamnesia.pro` are still present)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: All preservation tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix email and calendar branding: replace "AnamnesIA" with "Atriax" in three locations

  - [x] 3.1 Implement the fix in all three files
    - `backend/src/services/mailService.ts` ~line 16: change `'AnamnesIA <noreply@anamnesia.pro>'` → `'Atriax <noreply@anamnesia.pro>'`
    - `backend/src/services/eventFormatter.ts` ~line 72: change `title: 'AnamnesIA'` → `title: 'Atriax'`
    - `backend/src/services/icsGenerator.ts` ~line 226: change `'PRODID:-//AnamnesIA//Appointment Calendar//ES'` → `'PRODID:-//Atriax//Appointment Calendar//ES'`
    - **DO NOT** change `generateUID` — it returns `appointment-{id}@anamnesia.pro` which is a domain identifier, not a brand name
    - _Bug_Condition: isBugCondition(location) where location is one of the three hardcoded "AnamnesIA" string literals_
    - _Expected_Behavior: all three locations produce "Atriax" instead of "AnamnesIA" in outgoing communications_
    - _Preservation: RESEND_FROM override, noreply@anamnesia.pro address, UID domain, organizer field, and all other ICS/email fields remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AnamnesIA Brand Name in Three Locations
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - The tests from task 1 encode the expected behavior (assert "Atriax" in all three locations)
    - When these tests pass, it confirms the expected behavior is satisfied
    - Run bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: All three tests PASS (confirms bug is fixed in all locations)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Domain and Non-Brand Strings Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
    - Confirm `anamnesia.pro` domain strings are untouched, `RESEND_FROM` override still works, ICS structure is intact

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
