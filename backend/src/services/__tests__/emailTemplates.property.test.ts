/**
 * Property-based tests for emailTemplates — passwordResetTemplate
 * Feature: forgot-password, Property 12
 * Uses fast-check with Jest
 */

import * as fc from 'fast-check';
import { passwordResetTemplate } from '../emailTemplates.js';

describe('emailTemplates — property-based tests', () => {
  // ── Property 12 ────────────────────────────────────────────────────────────
  test('Property 12: passwordResetTemplate returns correct subject, contains the URL, and mentions "1 hora"', () => {
    // **Validates: Requirements 5.1, 5.2, 5.3**
    const hexChars = '0123456789abcdef';
    const tokenArb = fc
      .array(fc.integer({ min: 0, max: 15 }), { minLength: 64, maxLength: 64 })
      .map((arr) => arr.map((n) => hexChars[n]).join(''));

    const resetUrlArb = fc
      .tuple(
        fc.constantFrom(
          'https://app.example.com',
          'http://localhost:5173',
          'https://atriax.io'
        ),
        tokenArb
      )
      .map(([base, token]) => `${base}/reset-password?token=${token}`);

    fc.assert(
      fc.property(resetUrlArb, (resetUrl) => {
        const { subject, html, text } = passwordResetTemplate(resetUrl);

        // Subject must be exactly this string
        expect(subject).toBe('Recuperación de contraseña - Atriax');

        // HTML must contain the reset URL
        expect(html).toContain(resetUrl);

        // HTML must mention 1 hora (expiry notice)
        expect(html).toContain('1 hora');

        // Text must also contain the URL and mention 1 hora
        expect(text).toContain(resetUrl);
        expect(text).toContain('1 hora');
      }),
      { numRuns: 100 }
    );
  });
});
