import {
  assertValidMonth,
  currentBillingMonth,
  isOverdue,
} from './infraPaymentService.js';

describe('isOverdue', () => {
  it('is never overdue while the month is paid', () => {
    expect(isOverdue(true, new Date('2026-08-28T00:00:00.000Z'))).toBe(false);
  });

  it('is not overdue on or before the due day', () => {
    expect(isOverdue(false, new Date('2026-08-01T00:00:00.000Z'))).toBe(false);
    expect(isOverdue(false, new Date('2026-08-10T23:59:00.000Z'))).toBe(false);
  });

  it('is overdue from the day after the due day', () => {
    expect(isOverdue(false, new Date('2026-08-11T00:00:00.000Z'))).toBe(true);
    expect(isOverdue(false, new Date('2026-08-31T00:00:00.000Z'))).toBe(true);
  });
});

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
