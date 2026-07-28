import { describe, expect, it } from 'vitest';
import {
  formatMonthValue,
  getCurrentMonthValue,
  getMonthDateRange,
} from './monthRange';

describe('monthRange', () => {
  it('formats the current month as an input month value', () => {
    expect(getCurrentMonthValue(new Date(2026, 6, 15))).toBe('2026-07');
  });

  it('creates local boundaries for the selected month', () => {
    const range = getMonthDateRange('2026-07');
    const start = new Date(range.startDate);
    const end = new Date(range.endDate);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(6);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(6);
    expect(end.getDate()).toBe(31);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });

  it('rejects malformed month values', () => {
    expect(() => getMonthDateRange('2026-13')).toThrow('Invalid month value');
  });

  it('formats a readable Spanish month label', () => {
    expect(formatMonthValue('2026-07')).toMatch(/julio.*2026/i);
  });
});
