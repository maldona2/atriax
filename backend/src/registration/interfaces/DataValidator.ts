import { RegistrationData, ValidationResult } from '../models';

/**
 * Data Validator interface
 * Validates and sanitizes all input data for registration
 */
export interface DataValidator {
  /**
   * Validate email format and uniqueness
   * @param email - Email address to validate
   * @returns Validation result with success status and error messages
   */
  validateEmail(email: string): Promise<ValidationResult>;

  /**
   * Validate password strength requirements
   * @param password - Password to validate
   * @returns Validation result with success status and error messages
   */
  validatePassword(password: string): ValidationResult;

  /**
   * Validate all required fields are present and valid
   * @param data - Registration data to validate
   * @returns Validation result with success status and error messages
   */
  validateRequiredFields(data: RegistrationData): ValidationResult;

  /**
   * Sanitize input data to prevent injection attacks
   * @param input - Input string to sanitize
   * @returns Sanitized input string
   */
  sanitizeInput(input: string): string;

  /**
   * Validate password confirmation matches password
   * @param password - Original password
   * @param confirmPassword - Password confirmation
   * @returns Validation result
   */
  validatePasswordConfirmation(password: string, confirmPassword: string): ValidationResult;
}