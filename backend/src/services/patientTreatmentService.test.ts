import { computeNextDueDate } from './patientTreatmentService.js';

describe('computeNextDueDate', () => {
  const base = new Date('2026-01-01T10:00:00.000Z');

  it('returns null when baseDate is null', () => {
    expect(
      computeNextDueDate({
        baseDate: null,
        currentSession: 1,
        initialSessionsCount: 3,
        initialFrequencyWeeks: 2,
        maintenanceFrequencyWeeks: 12,
      })
    ).toBeNull();
  });

  it('uses initial frequency while in the initial phase', () => {
    const result = computeNextDueDate({
      baseDate: base,
      currentSession: 1,
      initialSessionsCount: 3,
      initialFrequencyWeeks: 2,
      maintenanceFrequencyWeeks: 12,
    });
    expect(result).toEqual(new Date('2026-01-15T10:00:00.000Z'));
  });

  it('switches to maintenance frequency once currentSession >= initialSessionsCount', () => {
    const result = computeNextDueDate({
      baseDate: base,
      currentSession: 3,
      initialSessionsCount: 3,
      initialFrequencyWeeks: 2,
      maintenanceFrequencyWeeks: 12,
    });
    expect(result).toEqual(new Date('2026-03-26T10:00:00.000Z'));
  });

  it('returns null when the applicable frequency is null (initial phase, no initial freq)', () => {
    expect(
      computeNextDueDate({
        baseDate: base,
        currentSession: 1,
        initialSessionsCount: 3,
        initialFrequencyWeeks: null,
        maintenanceFrequencyWeeks: 12,
      })
    ).toBeNull();
  });

  it('returns null in maintenance phase when maintenance frequency is null', () => {
    expect(
      computeNextDueDate({
        baseDate: base,
        currentSession: 5,
        initialSessionsCount: 3,
        initialFrequencyWeeks: 2,
        maintenanceFrequencyWeeks: null,
      })
    ).toBeNull();
  });

  it('treats null initialSessionsCount as "not in initial phase complete" and uses initial frequency', () => {
    const result = computeNextDueDate({
      baseDate: base,
      currentSession: 4,
      initialSessionsCount: null,
      initialFrequencyWeeks: 2,
      maintenanceFrequencyWeeks: 12,
    });
    expect(result).toEqual(new Date('2026-01-15T10:00:00.000Z'));
  });
});
