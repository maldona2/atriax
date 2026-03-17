/**
 * Validation result for input validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  field?: string;
}