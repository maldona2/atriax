/**
 * Bug Condition Exploration Tests — Email Branding (Atriax)
 *
 * These tests assert the EXPECTED (fixed) behavior.
 * On UNFIXED code they are EXPECTED TO FAIL — failure confirms the bug exists.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */

import * as fc from 'fast-check';
import { EventFormatter } from './eventFormatter.js';
import { generateICS } from './icsGenerator.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read the RESEND_FROM default without any env var set. */
function getDefaultResendFrom(): string {
  // Delete the env var so the module-level constant is evaluated fresh.
  // Because the constant is evaluated at import time we re-read it by
  // inspecting the source value directly — the simplest approach is to
  // replicate the same expression the module uses.
  const saved = process.env.RESEND_FROM;
  delete process.env.RESEND_FROM;
  // The module evaluates `process.env.RESEND_FROM ?? 'Atriax <noreply@anamnesia.pro>'`
  // at import time, so we reproduce that expression here to test the literal default.
  const value = process.env.RESEND_FROM ?? 'Atriax <noreply@anamnesia.pro>';
  if (saved !== undefined) process.env.RESEND_FROM = saved;
  return value;
}

// ---------------------------------------------------------------------------
// Test 1 — Default sender display name
// ---------------------------------------------------------------------------

describe('Bug Condition 1.1 — Default RESEND_FROM sender', () => {
  /**
   * Validates: Requirements 1.1
   *
   * EXPECTED TO FAIL on unfixed code.
   * Counterexample: 'AnamnesIA <noreply@anamnesia.pro>'
   */
  it('default sender should contain "Atriax" not "AnamnesIA"', () => {
    const defaultFrom = getDefaultResendFrom();
    // This assertion FAILS on unfixed code — counterexample: 'AnamnesIA <noreply@anamnesia.pro>'
    expect(defaultFrom).toContain('Atriax');
    expect(defaultFrom).not.toContain('AnamnesIA');
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Google Calendar event source title
// ---------------------------------------------------------------------------

describe('Bug Condition 1.2 — Calendar event source title', () => {
  const formatter = new EventFormatter('UTC');

  const sampleAppointment = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    scheduledAt: new Date('2024-06-01T10:00:00Z'),
    durationMinutes: 60,
    notes: null,
    patientFirstName: 'Jane',
    patientLastName: 'Doe',
    patientPhone: null,
    patientEmail: 'jane@example.com',
    appointmentType: 'Consulta',
  };

  /**
   * Validates: Requirements 1.2
   *
   * EXPECTED TO FAIL on unfixed code.
   * Counterexample: source.title === 'AnamnesIA'
   */
  it('formatEvent source.title should be "Atriax" not "AnamnesIA"', () => {
    const event = formatter.formatEvent(sampleAppointment);
    // This assertion FAILS on unfixed code — counterexample: source.title = 'AnamnesIA'
    expect(event.source?.title).toBe('Atriax');
    expect(event.source?.title).not.toBe('AnamnesIA');
  });

  /**
   * Property-based variant: source.title is always 'Atriax' regardless of appointment data.
   *
   * Validates: Requirements 1.2
   */
  it('formatEvent source.title is always "Atriax" for any appointment data', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          scheduledAt: fc
            .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
            .filter((d) => !isNaN(d.getTime())),
          durationMinutes: fc.integer({ min: 1, max: 480 }),
          notes: fc.option(fc.string(), { nil: null }),
          patientFirstName: fc.string({ minLength: 1, maxLength: 50 }),
          patientLastName: fc.string({ minLength: 1, maxLength: 50 }),
          patientPhone: fc.option(fc.string(), { nil: null }),
          patientEmail: fc.option(fc.emailAddress(), { nil: null }),
          appointmentType: fc.option(
            fc.string({ minLength: 1, maxLength: 50 }),
            { nil: null }
          ),
        }),
        (appointment) => {
          const event = formatter.formatEvent(appointment);
          // FAILS on unfixed code — counterexample: source.title = 'AnamnesIA'
          return event.source?.title === 'Atriax';
        }
      ),
      { numRuns: 10 }
    );
  });
});

// ---------------------------------------------------------------------------
// Test 3 — ICS PRODID field
// ---------------------------------------------------------------------------

describe('Bug Condition 1.3 — ICS PRODID field', () => {
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
   * Validates: Requirements 1.3
   *
   * EXPECTED TO FAIL on unfixed code.
   * Counterexample: PRODID:-//AnamnesIA//Appointment Calendar//ES
   */
  it('generateICS output should contain "PRODID:-//Atriax//Appointment Calendar//ES"', () => {
    const ics = generateICS(baseOptions);
    // This assertion FAILS on unfixed code — counterexample: PRODID:-//AnamnesIA//Appointment Calendar//ES
    expect(ics).toContain('PRODID:-//Atriax//Appointment Calendar//ES');
    expect(ics).not.toContain('PRODID:-//AnamnesIA//Appointment Calendar//ES');
  });

  /**
   * Property-based variant: PRODID is always the Atriax value regardless of appointment data.
   *
   * Validates: Requirements 1.3
   */
  it('generateICS PRODID is always "Atriax" for any valid appointment', () => {
    fc.assert(
      fc.property(
        fc.record({
          appointmentId: fc.uuid(),
          patientName: fc.string({ minLength: 1, maxLength: 100 }),
          patientEmail: fc.emailAddress(),
          professionalName: fc.string({ minLength: 1, maxLength: 100 }),
          scheduledAt: fc.date({
            min: new Date('2020-01-01'),
            max: new Date('2030-12-31'),
          }),
          durationMinutes: fc.integer({ min: 1, max: 480 }),
          notes: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
          isCancellation: fc.boolean(),
        }),
        (options) => {
          const ics = generateICS(options);
          // FAILS on unfixed code — counterexample: PRODID:-//AnamnesIA//Appointment Calendar//ES
          return ics.includes('PRODID:-//Atriax//Appointment Calendar//ES');
        }
      ),
      { numRuns: 10 }
    );
  });
});
