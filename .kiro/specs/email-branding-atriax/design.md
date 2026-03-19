# Email Branding Atriax Bugfix Design

## Overview

The app has been rebranded from "AnamnesIA" to "Atriax", but three locations in the backend still
emit the old brand name in outgoing communications:

1. `mailService.ts` — default sender display name fallback
2. `eventFormatter.ts` — Google Calendar event source title
3. `icsGenerator.ts` — ICS `PRODID` field

The fix is a targeted string replacement in each of these three locations. The email domain
(`anamnesia.pro`) and all other behavior remain unchanged.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — any code path that produces the
  string `"AnamnesIA"` in outgoing email sender names, calendar event metadata, or ICS files
- **Property (P)**: The desired behavior — the string `"Atriax"` appears wherever the brand name
  is displayed to end users
- **Preservation**: All other behavior (email delivery, domain names, UIDs, organizer fields,
  RESEND_FROM override, ICS structure) must remain unchanged
- **RESEND_FROM**: Environment variable that, when set, overrides the default sender address entirely
- **PRODID**: RFC 5545 ICS field identifying the software that created the calendar file
- **generateUID**: Function in `icsGenerator.ts` that produces `appointment-{id}@anamnesia.pro` —
  this is a domain identifier, not a brand name, and must NOT be changed

## Bug Details

### Bug Condition

The bug manifests in three independent code locations, each hardcoding the string `"AnamnesIA"`.
None of these locations are guarded by a runtime condition — they always emit the old brand name.

**Formal Specification:**
```
FUNCTION isBugCondition(location)
  INPUT: location — one of the three hardcoded string sites
  OUTPUT: boolean

  RETURN location IS ONE OF:
    mailService.ts    line ~16: 'AnamnesIA <noreply@anamnesia.pro>'  (when RESEND_FROM not set)
    eventFormatter.ts line ~72: source.title = 'AnamnesIA'
    icsGenerator.ts   line ~226: 'PRODID:-//AnamnesIA//Appointment Calendar//ES'
END FUNCTION
```

### Examples

- Email sent without `RESEND_FROM` set → recipient sees sender `"AnamnesIA <noreply@anamnesia.pro>"`
  instead of `"Atriax <noreply@anamnesia.pro>"`
- Google Calendar event created → source title shows `"AnamnesIA"` instead of `"Atriax"`
- ICS file attached to appointment email → `PRODID` reads `-//AnamnesIA//Appointment Calendar//ES`
  instead of `-//Atriax//Appointment Calendar//ES`
- Email sent with `RESEND_FROM` explicitly set → sender is the configured value (no bug, not affected)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When `RESEND_FROM` env var is set, the configured value is used as-is without modification
- The sender email address `noreply@anamnesia.pro` remains unchanged in all cases
- ICS UIDs continue to use the format `appointment-{id}@anamnesia.pro`
- ICS `ORGANIZER` field continues to use `noreply@anamnesia.pro`
- All email content, attachments, and calendar invite delivery continues to work correctly
- ICS file structure, RFC 5545 compliance, and all other fields remain unchanged

**Scope:**
All inputs that do NOT involve the three hardcoded brand name strings are completely unaffected.
This includes:
- Any email sent when `RESEND_FROM` is set
- All domain references (`anamnesia.pro`) in UIDs, organizer fields, and email addresses
- All other ICS fields (DTSTART, DTEND, SUMMARY, ATTENDEE, STATUS, SEQUENCE, etc.)
- Google Calendar event fields other than `source.title`

## Hypothesized Root Cause

The rebranding was incomplete. The three occurrences of `"AnamnesIA"` are simple string literals
that were not updated when the product was renamed to Atriax:

1. **mailService.ts default fallback**: `'AnamnesIA <noreply@anamnesia.pro>'` — the display name
   portion of the default sender string was not updated
2. **eventFormatter.ts source title**: `source: { title: 'AnamnesIA', ... }` — the hardcoded
   Google Calendar event source title was not updated
3. **icsGenerator.ts PRODID**: `'PRODID:-//AnamnesIA//Appointment Calendar//ES'` — the ICS
   product identifier string was not updated

There is no logic error; these are purely cosmetic string literals that need to be updated.

## Correctness Properties

Property 1: Bug Condition - Brand Name Updated in All Three Locations

_For any_ code path that produces outgoing email sender display names, Google Calendar event
source titles, or ICS PRODID fields, the fixed code SHALL produce the string `"Atriax"` in
place of `"AnamnesIA"` in all three locations.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Domain and Non-Brand Strings Unchanged

_For any_ code path where the bug condition does NOT hold (i.e., all domain references, UID
generation, organizer fields, RESEND_FROM override, and all other ICS/email fields), the fixed
code SHALL produce exactly the same output as the original code, preserving all existing
functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `backend/src/services/mailService.ts`

**Change**: Update default sender display name
- Line ~16: `'AnamnesIA <noreply@anamnesia.pro>'` → `'Atriax <noreply@anamnesia.pro>'`

---

**File**: `backend/src/services/eventFormatter.ts`

**Change**: Update Google Calendar event source title
- Line ~72: `title: 'AnamnesIA'` → `title: 'Atriax'`

---

**File**: `backend/src/services/icsGenerator.ts`

**Change**: Update ICS PRODID field
- Line ~226: `'PRODID:-//AnamnesIA//Appointment Calendar//ES'` → `'PRODID:-//Atriax//Appointment Calendar//ES'`

**Note**: The `generateUID` function returns `appointment-{id}@anamnesia.pro` — this uses the
domain name, not the brand name, and must NOT be changed.

## Testing Strategy

### Validation Approach

Two-phase approach: first confirm the bug exists on unfixed code, then verify the fix is correct
and preserves all existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples demonstrating the bug BEFORE implementing the fix. Confirm the
root cause is purely the three hardcoded string literals.

**Test Plan**: Write unit tests that call each affected function/module and assert the output
contains `"Atriax"` (not `"AnamnesIA"`). Run on unfixed code to observe failures.

**Test Cases**:
1. **Default sender test**: Read `RESEND_FROM` constant without env var set, assert it contains
   `"Atriax"` (will fail on unfixed code — shows `"AnamnesIA"`)
2. **Calendar source title test**: Call `eventFormatter.formatEvent(...)`, assert
   `result.source.title === 'Atriax'` (will fail on unfixed code)
3. **ICS PRODID test**: Call `generateICS(...)`, assert output contains
   `'PRODID:-//Atriax//Appointment Calendar//ES'` (will fail on unfixed code)

**Expected Counterexamples**:
- All three tests fail with the old brand name `"AnamnesIA"` in the output
- Confirms root cause: three independent hardcoded string literals

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the
correct brand name.

**Pseudocode:**
```
FOR ALL location WHERE isBugCondition(location) DO
  result := fixedCode(location)
  ASSERT result CONTAINS 'Atriax'
  ASSERT result NOT CONTAINS 'AnamnesIA'
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code
produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalCode(input) = fixedCode(input)
END FOR
```

**Testing Approach**: Property-based testing is well-suited here because:
- UID generation accepts arbitrary UUID strings — we can generate many and verify the domain
  portion is always `anamnesia.pro` and never changes
- ICS organizer field accepts arbitrary professional names — we can verify the email address
  portion is always `noreply@anamnesia.pro`
- This gives strong guarantees that the domain strings are untouched across all inputs

**Test Cases**:
1. **RESEND_FROM override preservation**: When env var is set, verify the configured value is
   used unchanged
2. **UID domain preservation**: For many random UUIDs, verify `generateUID` always returns
   `appointment-{id}@anamnesia.pro`
3. **Organizer email preservation**: For many professional names, verify ICS organizer field
   always uses `noreply@anamnesia.pro`
4. **ICS structure preservation**: Verify all other ICS fields (DTSTART, DTEND, SUMMARY,
   ATTENDEE, STATUS, SEQUENCE, VERSION, METHOD, CALSCALE) are unchanged

### Unit Tests

- Assert `RESEND_FROM` default contains `"Atriax <noreply@anamnesia.pro>"` when env var is unset
- Assert `eventFormatter.formatEvent(...)` returns `source.title === 'Atriax'`
- Assert `generateICS(...)` output contains `PRODID:-//Atriax//Appointment Calendar//ES`
- Assert `generateICS(...)` output does NOT contain `AnamnesIA` anywhere

### Property-Based Tests

- Generate random valid UUIDs and verify `generateUID` always produces `@anamnesia.pro` suffix
  (domain preserved, not brand name)
- Generate random professional names and verify ICS organizer email is always `noreply@anamnesia.pro`
- Generate random appointment data and verify no field other than PRODID changes between original
  and fixed `generateICS`

### Integration Tests

- Send a test appointment email without `RESEND_FROM` set and verify the `from` field is
  `"Atriax <noreply@anamnesia.pro>"`
- Create a Google Calendar event and verify `source.title` is `"Atriax"`
- Generate a full ICS file and verify PRODID, UID, and ORGANIZER fields are all correct
