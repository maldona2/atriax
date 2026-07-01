import {
  assertValidMonth,
  currentBillingMonth,
} from './infraPaymentService.js';

describe('currentBillingMonth', () => {
  it('formats a date as YYYY-MM (UTC)', () => {
    expect(currentBillingMonth(new Date('2026-07-01T12:00:00.000Z'))).toBe(
      '2026-07'
    );
  });

  it('zero-pads single-digit months', () => {
    expect(currentBillingMonth(new Date('2026-01-15T00:00:00.000Z'))).toBe(
      '2026-01'
    );
  });

  it('uses UTC at month boundaries', () => {
    // 2026-01-31 23:00 UTC is still January in UTC.
    expect(currentBillingMonth(new Date('2026-01-31T23:00:00.000Z'))).toBe(
      '2026-01'
    );
  });
});

describe('assertValidMonth', () => {
  it('accepts a valid YYYY-MM string', () => {
    expect(() => assertValidMonth('2026-07')).not.toThrow();
    expect(() => assertValidMonth('2026-12')).not.toThrow();
    expect(() => assertValidMonth('2026-01')).not.toThrow();
  });

  it('rejects malformed months with a 400 error', () => {
    for (const bad of [
      '2026-13',
      '2026-00',
      '26-07',
      '2026-7',
      '2026/07',
      '',
    ]) {
      let thrown: (Error & { statusCode?: number }) | null = null;
      try {
        assertValidMonth(bad);
      } catch (e) {
        thrown = e as Error & { statusCode?: number };
      }
      expect(thrown).not.toBeNull();
      expect(thrown?.statusCode).toBe(400);
    }
  });
});
