import { DataValidator } from '../interfaces/DataValidator';
import { RegistrationData, ValidationResult } from '../models';

/**
 * ValidationService implements comprehensive data validation and sanitization
 * for user registration data including email format, password strength, and security
 */
export class ValidationService implements DataValidator {
  private readonly emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  /**
   * Validate email format and uniqueness
   * RFC 5322 compliant email validation
   */
  async validateEmail(email: string): Promise<ValidationResult> {
    const errors: string[] = [];
    
    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
    } else {
      const trimmedEmail = email.trim();
      
      // Check basic format
      if (!this.emailRegex.test(trimmedEmail)) {
        errors.push('Email format is invalid');
      }
      
      // Check length constraints
      if (trimmedEmail.length > 254) {
        errors.push('Email address is too long');
      }
      
      // Check local part length (before @)
      const localPart = trimmedEmail.split('@')[0];
      if (localPart && localPart.length > 64) {
        errors.push('Email local part is too long');
      }
      
      // Additional RFC 5322 checks
      if (trimmedEmail.includes('..')) {
        errors.push('Email cannot contain consecutive dots');
      }
      
      if (trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
        errors.push('Email cannot start or end with a dot');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      field: 'email'
    };
  }

  /**
   * Validate password strength requirements
   * Requires 8+ characters, uppercase, lowercase, and numeric
   */
  validatePassword(password: string): ValidationResult {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Password is required');
    } else {
      // Check minimum length
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
      
      // Check maximum length for security
      if (password.length > 128) {
        errors.push('Password must be less than 128 characters');
      }
      
      // Check for uppercase letter
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      
      // Check for lowercase letter
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      
      // Check for numeric character
      if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
      }
      
      // Check for common weak passwords
      const commonPasswords = [
        'password', '12345678', 'qwerty123', 'abc123456', 
        'password123', 'admin123', 'letmein123'
      ];
      
      if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('Password is too common, please choose a stronger password');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      field: 'password'
    };
  }

  /**
   * Validate password confirmation matches password
   */
  validatePasswordConfirmation(password: string, confirmPassword: string): ValidationResult {
    const errors: string[] = [];
    
    if (!confirmPassword) {
      errors.push('Password confirmation is required');
    } else if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      field: 'confirmPassword'
    };
  }

  /**
   * Validate all required fields are present and valid
   */
  validateRequiredFields(data: RegistrationData): ValidationResult {
    const errors: string[] = [];
    
    // Check required fields
    if (!data.email || data.email.trim().length === 0) {
      errors.push('Email is required');
    }
    
    if (!data.password) {
      errors.push('Password is required');
    }
    
    if (!data.confirmPassword) {
      errors.push('Password confirmation is required');
    }
    
    if (!data.firstName || data.firstName.trim().length === 0) {
      errors.push('First name is required');
    }
    
    if (!data.lastName || data.lastName.trim().length === 0) {
      errors.push('Last name is required');
    }
    
    // Validate name fields
    if (data.firstName && data.firstName.trim().length > 0) {
      if (data.firstName.trim().length < 2) {
        errors.push('First name must be at least 2 characters long');
      }
      
      if (data.firstName.trim().length > 50) {
        errors.push('First name must be less than 50 characters');
      }
      
      if (!/^[A-Za-z\s'-]+$/.test(data.firstName.trim())) {
        errors.push('First name can only contain letters, spaces, hyphens, and apostrophes');
      }
    }
    
    if (data.lastName && data.lastName.trim().length > 0) {
      if (data.lastName.trim().length < 2) {
        errors.push('Last name must be at least 2 characters long');
      }
      
      if (data.lastName.trim().length > 50) {
        errors.push('Last name must be less than 50 characters');
      }
      
      if (!/^[A-Za-z\s'-]+$/.test(data.lastName.trim())) {
        errors.push('Last name can only contain letters, spaces, hyphens, and apostrophes');
      }
    }
    
    // Check terms and privacy acceptance
    if (!data.acceptedTerms) {
      errors.push('You must accept the terms of service');
    }
    
    if (!data.acceptedPrivacy) {
      errors.push('You must accept the privacy policy');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize input data to prevent injection attacks
   * Removes potentially dangerous HTML, scripts, and SQL injection patterns
   */
  sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    let sanitized = input;
    
    // Remove HTML tags and scripts
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;script\b[^&]*(?:(?!&lt;\/script&gt;)&[^&]*)*&lt;\/script&gt;/gi, '');
    
    // Remove SQL injection patterns
    sanitized = sanitized
      .replace(/('|(\\')|(;)|(\\;)|(\|)|(\*)|(%)|(<)|(>)|(\{)|(\})|(\[)|(\]))/gi, '')
      .replace(/((\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE){0,1}|INSERT( +INTO){0,1}|MERGE|SELECT|UPDATE|UNION( +ALL){0,1})\b))/gi, '');
    
    // Remove JavaScript injection patterns
    sanitized = sanitized
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/onload/gi, '')
      .replace(/onerror/gi, '')
      .replace(/onclick/gi, '')
      .replace(/onmouseover/gi, '');
    
    // Remove path traversal attempts
    sanitized = sanitized
      .replace(/\.\.\//g, '')
      .replace(/\.\.\\/g, '');
    
    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Trim whitespace and limit length
    sanitized = sanitized.trim();
    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 1000);
    }
    
    return sanitized;
  }
}