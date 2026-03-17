import * as fc from 'fast-check';
import { describe, test, expect } from '@jest/globals';
import {
  validEmailGenerator,
  invalidEmailGenerator,
  validPasswordGenerator,
  weakPasswordGenerator,
  maliciousInputGenerator
} from './generators';
import { ValidationService } from '../services/ValidationService';

describe('Registration Validation Properties', () => {
  const validator = new ValidationService();

  // Feature: user-self-registration-free-tier, Property 2: Email Format Validation
  test('should accept valid email formats and reject invalid ones', async () => {
    await fc.assert(fc.asyncProperty(
      validEmailGenerator(),
      async (email) => {
        // **Validates: Requirements 1.2, 5.1**
        const result = await validator.validateEmail(email);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.field).toBe('email');
      }
    ), { numRuns: 5 });

    await fc.assert(fc.asyncProperty(
      invalidEmailGenerator(),
      async (email) => {
        // **Validates: Requirements 1.2, 5.1**
        const result = await validator.validateEmail(email);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.field).toBe('email');
      }
    ), { numRuns: 5 });
  });

  // Feature: user-self-registration-free-tier, Property 3: Password Strength Validation
  test('should accept strong passwords and reject weak ones', () => {
    fc.assert(fc.property(
      validPasswordGenerator(),
      (password) => {
        // **Validates: Requirements 1.3, 5.2**
        const result = validator.validatePassword(password);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.field).toBe('password');
      }
    ), { numRuns: 5 });

    fc.assert(fc.property(
      weakPasswordGenerator(),
      (password) => {
        // **Validates: Requirements 1.3, 5.2**
        const result = validator.validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.field).toBe('password');
      }
    ), { numRuns: 5 });
  });

  // Feature: user-self-registration-free-tier, Property 13: Input Sanitization
  test('should sanitize malicious input while preserving legitimate data', () => {
    fc.assert(fc.property(
      maliciousInputGenerator(),
      (maliciousInput) => {
        // **Validates: Requirements 5.5**
        const sanitized = validator.sanitizeInput(maliciousInput);
        
        // Sanitized output should not contain dangerous patterns
        expect(sanitized).not.toMatch(/<script>/i);
        expect(sanitized).not.toMatch(/DROP TABLE/i);
        expect(sanitized).not.toMatch(/javascript:/i);
        expect(sanitized).not.toMatch(/onerror=/i);
        expect(sanitized).not.toMatch(/\.\.\//);
        
        // Should be a string and not exceed length limit
        expect(typeof sanitized).toBe('string');
        expect(sanitized.length).toBeLessThanOrEqual(1000);
      }
    ), { numRuns: 5 });
  });
});