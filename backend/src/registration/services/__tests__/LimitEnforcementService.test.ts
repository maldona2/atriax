import { describe, it, expect } from '@jest/globals';
import { patientLimitForPlan, UNLIMITED } from '../LimitEnforcementService.js';

describe('patientLimitForPlan', () => {
  it('gold is unlimited', () => {
    expect(patientLimitForPlan('gold')).toBe(UNLIMITED);
  });

  it('pro is 50', () => {
    expect(patientLimitForPlan('pro')).toBe(50);
  });

  it('free is 5', () => {
    expect(patientLimitForPlan('free')).toBe(5);
  });

  it('unknown plan falls back to free limit', () => {
    expect(patientLimitForPlan('mystery')).toBe(5);
  });
});
