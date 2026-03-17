import * as fc from 'fast-check';
import { RegistrationRequest, RegistrationData, UserData } from '../models';

/**
 * Generator for valid email addresses
 */
export const validEmailGenerator = (): fc.Arbitrary<string> =>
  fc.tuple(
    fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,20}$/),
    fc.constantFrom('gmail.com', 'yahoo.com', 'hotmail.com', 'example.com', 'test.com')
  ).map(([local, domain]) => `${local}@${domain}`);

/**
 * Generator for invalid email addresses
 */
export const invalidEmailGenerator = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.string().filter(s => !s.includes('@')), // No @ symbol
    fc.string().map(s => `${s}@`), // Missing domain
    fc.string().map(s => `@${s}`), // Missing local part
    fc.constantFrom('invalid', 'test@', '@test.com', 'test..test@example.com')
  );

/**
 * Generator for valid passwords (8+ chars, uppercase, lowercase, numeric)
 */
export const validPasswordGenerator = (): fc.Arbitrary<string> =>
  fc.tuple(
    fc.stringMatching(/^[A-Z]{1,3}$/), // Uppercase letters
    fc.stringMatching(/^[a-z]{2,10}$/), // Lowercase letters
    fc.stringMatching(/^[0-9]{1,5}$/), // Numbers
    fc.stringMatching(/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{0,3}$/) // Special chars (optional)
  ).map(([upper, lower, numbers, special]) => 
    `${upper}${lower}${numbers}${special}`.slice(0, 20)
  );

/**
 * Generator for weak passwords
 */
export const weakPasswordGenerator = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.string({ maxLength: 7 }), // Too short
    fc.stringMatching(/^[a-z]+$/), // Only lowercase
    fc.stringMatching(/^[A-Z]+$/), // Only uppercase
    fc.stringMatching(/^[0-9]+$/), // Only numbers
    fc.constantFrom('password', '123456', 'qwerty', 'abc123')
  );

/**
 * Generator for valid names
 */
export const validNameGenerator = (): fc.Arbitrary<string> =>
  fc.stringMatching(/^[A-Za-z][A-Za-z\s'-]{1,30}$/)
    .filter(name => name.trim().length >= 2);

/**
 * Generator for valid registration data
 */
export const validRegistrationDataGenerator = (): fc.Arbitrary<RegistrationRequest> =>
  fc.record({
    email: validEmailGenerator(),
    password: validPasswordGenerator(),
    confirmPassword: fc.constant(''), // Will be set to match password
    firstName: validNameGenerator(),
    lastName: validNameGenerator(),
    acceptedTerms: fc.constant(true),
    acceptedPrivacy: fc.constant(true)
  }).map(data => ({
    ...data,
    confirmPassword: data.password // Ensure passwords match
  }));

/**
 * Generator for invalid registration data
 */
export const invalidRegistrationDataGenerator = (): fc.Arbitrary<RegistrationRequest> =>
  fc.record({
    email: fc.oneof(validEmailGenerator(), invalidEmailGenerator()),
    password: fc.oneof(validPasswordGenerator(), weakPasswordGenerator()),
    confirmPassword: fc.string(), // Random string that likely won't match
    firstName: fc.oneof(validNameGenerator(), fc.string({ maxLength: 1 })),
    lastName: fc.oneof(validNameGenerator(), fc.string({ maxLength: 1 })),
    acceptedTerms: fc.boolean(),
    acceptedPrivacy: fc.boolean()
  });

/**
 * Generator for user data
 */
export const userDataGenerator = (): fc.Arbitrary<UserData> =>
  fc.record({
    email: validEmailGenerator(),
    password: validPasswordGenerator(),
    firstName: validNameGenerator(),
    lastName: validNameGenerator(),
    tenantId: fc.option(fc.uuid(), { nil: undefined })
  });

/**
 * Generator for malicious input strings (for injection testing)
 */
export const maliciousInputGenerator = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constantFrom(
      '<script>alert("xss")</script>',
      "'; DROP TABLE users; --",
      '${7*7}',
      '{{7*7}}',
      '../../../etc/passwd',
      'javascript:alert(1)',
      '<img src=x onerror=alert(1)>',
      "' OR '1'='1",
      'SELECT * FROM users WHERE id = 1; --'
    ),
    fc.string().filter(s => s.includes('<script>') || s.includes('DROP TABLE'))
  );