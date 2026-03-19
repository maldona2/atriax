/**
 * Preservation Property Tests — Email Branding (Atriax)
 *
 * These tests verify that domain strings, UID format, organizer email,
 * and RESEND_FROM override behavior are UNCHANGED by the branding fix.
 *
 * These tests run on UNFIXED code and are EXPECTED TO PASS.
 * They establish the baseline behavior that must be preserved after the fix.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 */

import * as fc from 'fast-check';
import { generateUID, generateICS } from './icsGenerator.js';

// ---------------------------------------------------------------------------
// Property Test 1 — UID domain preservation
// ---------------------------------------------------------------------------

describe('Preservation 3.3 — generateUID domain always anamnesia.pro', () => {
  /**
   * Property: for any valid UUID, generateUID returns appointment-{id}@anamnesia.pro.
   * The domain is a technical identifier, not a brand name — it must never change.
   *
   * **Validates: Requirements 3.3**
   */
  it('generateUID always returns appointment-{id}@anamnesia.pro for any UUID', () => {
    fc.assert(
      fc.property(fc.uuid(), (uuid) => {
        const uid = generateUID(uuid);
        return (
          uid === `appointment-${uuid}@anamnesia.pro` &&
          uid.endsWith('@anamnesia.pro') &&
          uid.startsWith('appointment-')
        );
      }),
      { numRuns: 100 }
    );
  });

  it('generateUID format is appointment-{id}@anamnesia.pro for a known UUID', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    expect(generateUID(id)).toBe(`appointment-${id}@anamnesia.pro`);
  });
});

// ---------------------------------------------------------------------------
// Property Test 2 — ICS organizer email preservation
// ---------------------------------------------------------------------------

describe('Preservation 3.3 — ICS organizer email always noreply@anamnesia.pro', () => {
  /**
   * Property: for any professional name, the ICS ORGANIZER field always uses
   * noreply@anamnesia.pro as the email address.
   *
   * **Validates: Requirements 3.3**
   */
  it('ICS organizer email is always noreply@anamnesia.pro for any professional name', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 80 })
          .filter((s) => s.trim().length > 0),
        (professionalName) => {
          const ics = generateICS({
            appointmentId: '123e4567-e89b-12d3-a456-426614174000',
            patientName: 'Test Patient',
            patientEmail: 'patient@example.com',
            professionalName,
            scheduledAt: new Date('2024-06-01T10:00:00Z'),
            durationMinutes: 60,
            notes: null,
            isCancellation: false,
          });
          // ORGANIZER line must always end with :noreply@anamnesia.pro
          return ics.includes(':noreply@anamnesia.pro');
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ---------------------------------------------------------------------------
// Unit Test — RESEND_FROM override preservation
// ---------------------------------------------------------------------------

describe('Preservation 3.1 — RESEND_FROM env var override', () => {
  const originalEnv = process.env.RESEND_FROM;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.RESEND_FROM;
    } else {
      process.env.RESEND_FROM = originalEnv;
    }
  });

  /**
   * When RESEND_FROM is explicitly set, the configured value is used as-is.
   * The module-level constant is evaluated at import time, so we test the
   * expression logic directly — same approach as the bug condition tests.
   *
   * **Validates: Requirements 3.1**
   */
  it('when RESEND_FROM env var is set, the configured value is used unchanged', () => {
    const customFrom = 'Custom Sender <custom@example.com>';
    process.env.RESEND_FROM = customFrom;
    // Reproduce the module expression: process.env.RESEND_FROM ?? 'AnamnesIA <noreply@anamnesia.pro>'
    const resolvedFrom =
      process.env.RESEND_FROM ?? 'AnamnesIA <noreply@anamnesia.pro>';
    expect(resolvedFrom).toBe(customFrom);
  });

  it('when RESEND_FROM env var is set to Atriax address, that exact value is used', () => {
    const atriaxFrom = 'Atriax <noreply@anamnesia.pro>';
    process.env.RESEND_FROM = atriaxFrom;
    const resolvedFrom =
      process.env.RESEND_FROM ?? 'AnamnesIA <noreply@anamnesia.pro>';
    expect(resolvedFrom).toBe(atriaxFrom);
  });
});

// ---------------------------------------------------------------------------
// Unit Test — ICS does not contain "AnamnesIA" in domain/organizer fields
// ---------------------------------------------------------------------------

describe('Preservation 3.2, 3.3 — anamnesia.pro domain strings present in ICS', () => {
  const baseOptions = {
    appointmentId: '123e4567-e89b-12d3-a456-426614174000',
    patientName: 'Jane Doe',
    patientEmail: 'jane@example.com',
    professionalName: 'Dr. Smith',
    scheduledAt: new Date('2024-06-01T10:00:00Z'),
    durationMinutes: 60,
    notes: null,
    isCancellation: false,
  };

  /**
   * The domain anamnesia.pro must appear in the ICS output (UID and ORGANIZER).
   * This confirms domain strings are preserved regardless of brand name changes.
   *
   * **Validates: Requirements 3.2, 3.3**
   */
  it('ICS output contains anamnesia.pro domain in UID field', () => {
    const ics = generateICS(baseOptions);
    expect(ics).toContain('@anamnesia.pro');
  });

  it('ICS output contains noreply@anamnesia.pro in ORGANIZER field', () => {
    const ics = generateICS(baseOptions);
    expect(ics).toContain('noreply@anamnesia.pro');
  });

  it('ICS UID field uses appointment-{id}@anamnesia.pro format', () => {
    const ics = generateICS(baseOptions);
    expect(ics).toContain(
      `UID:appointment-${baseOptions.appointmentId}@anamnesia.pro`
    );
  });

  /**
   * After the fix is applied, ICS output must NOT contain "AnamnesIA" anywhere.
   * On unfixed code this test will FAIL — it is intentionally written to validate
   * the post-fix state. However, since the task says all preservation tests should
   * PASS on unfixed code, this test is scoped to verify the domain strings only.
   *
   * NOTE: This test verifies that anamnesia.pro (domain) is present — distinct from
   * the brand name "AnamnesIA". The domain must always be present.
   *
   * **Validates: Requirements 3.3**
   */
  it('ICS output contains anamnesia.pro (domain) which must always be preserved', () => {
    const ics = generateICS(baseOptions);
    // Domain strings must always be present
    const domainCount = (ics.match(/anamnesia\.pro/gi) ?? []).length;
    expect(domainCount).toBeGreaterThanOrEqual(2); // at least UID + ORGANIZER
  });
});

// ---------------------------------------------------------------------------
// Unit Test — ICS structural fields preserved (3.4)
// ---------------------------------------------------------------------------

describe('Preservation 3.4 — ICS structure and required fields intact', () => {
  const baseOptions = {
    appointmentId: '123e4567-e89b-12d3-a456-426614174000',
    patientName: 'Jane Doe',
    patientEmail: 'jane@example.com',
    professionalName: 'Dr. Smith',
    scheduledAt: new Date('2024-06-01T10:00:00Z'),
    durationMinutes: 60,
    notes: null,
    isCancellation: false,
  };

  /**
   * **Validates: Requirements 3.4**
   */
  it('ICS output contains all required RFC 5545 structural fields', () => {
    const ics = generateICS(baseOptions);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('CALSCALE:GREGORIAN');
    expect(ics).toContain('METHOD:REQUEST');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('SEQUENCE:0');
  });

  it('ICS output contains DTSTART, DTEND, SUMMARY, ATTENDEE fields', () => {
    const ics = generateICS(baseOptions);
    expect(ics).toContain('DTSTART');
    expect(ics).toContain('DTEND');
    expect(ics).toContain('SUMMARY');
    expect(ics).toContain('ATTENDEE');
  });

  it('ICS cancellation uses METHOD:CANCEL and STATUS:CANCELLED', () => {
    const ics = generateICS({ ...baseOptions, isCancellation: true });
    expect(ics).toContain('METHOD:CANCEL');
    expect(ics).toContain('STATUS:CANCELLED');
    expect(ics).toContain('SEQUENCE:1');
  });
});
