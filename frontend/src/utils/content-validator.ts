/**
 * Content validation utilities
 *
 * Provides comprehensive validation for specialty content using JSON Schema
 * and custom business logic validation rules.
 */

import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import {
  SpecialtyContent,
  ValidationResult,
  ContentError,
  ContentWarning,
  ContentValidationOptions,
} from '@/types/content';
import {
  specialtyContentSchema,
  CONTENT_LIMITS,
  VALIDATION_ERROR_CODES,
  VALIDATION_WARNING_CODES,
  SUPPORTED_LANGUAGES,
  SUPPORTED_SPECIALTIES,
  SupportedLanguage,
  SupportedSpecialty,
} from '@/schemas/content-schema';

// Initialize AJV with formats
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

// Compile the main schema
const validateSpecialtyContent = ajv.compile(specialtyContentSchema);

/**
 * Content validator class that provides comprehensive validation
 * for specialty content including schema validation and business rules
 */
export class ContentValidator {
  private options: ContentValidationOptions;

  constructor(options: ContentValidationOptions = {}) {
    this.options = {
      strict: true,
      allowPartial: false,
      validateReferences: true,
      maxLength: CONTENT_LIMITS,
      ...options,
    };
  }

  /**
   * Validates specialty content against schema and business rules
   */
  validate(content: Partial<SpecialtyContent>): ValidationResult {
    const errors: ContentError[] = [];
    const warnings: ContentWarning[] = [];

    try {
      // Schema validation
      const schemaErrors = this.validateSchema(content);
      errors.push(...schemaErrors);

      // Business rules validation (only if schema validation passes or partial validation is allowed)
      if (errors.length === 0 || this.options.allowPartial) {
        const businessErrors = this.validateBusinessRules(content);
        errors.push(...businessErrors);

        const businessWarnings = this.validateBusinessWarnings(content);
        warnings.push(...businessWarnings);
      }

      // Reference validation
      if (
        this.options.validateReferences &&
        content.specialty &&
        content.language
      ) {
        const referenceErrors = this.validateReferences(
          content as SpecialtyContent
        );
        errors.push(...referenceErrors);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            field: 'root',
            message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code: VALIDATION_ERROR_CODES.INVALID_FORMAT,
            severity: 'error',
          },
        ],
        warnings,
      };
    }
  }

  /**
   * Validates content against JSON schema
   */
  private validateSchema(content: Partial<SpecialtyContent>): ContentError[] {
    const errors: ContentError[] = [];

    if (!this.options.allowPartial) {
      // Full validation
      const isValid = validateSpecialtyContent(content);
      if (!isValid && validateSpecialtyContent.errors) {
        errors.push(...this.convertAjvErrors(validateSpecialtyContent.errors));
      }
    } else {
      // Partial validation - validate each section that exists
      if (content.hero) {
        const heroErrors = this.validateSection('hero', content.hero);
        errors.push(...heroErrors);
      }
      if (content.problems) {
        const problemErrors = this.validateSection(
          'problems',
          content.problems
        );
        errors.push(...problemErrors);
      }
      // Add other sections as needed
    }

    return errors;
  }

  /**
   * Validates business rules beyond schema validation
   */
  private validateBusinessRules(
    content: Partial<SpecialtyContent>
  ): ContentError[] {
    const errors: ContentError[] = [];

    // Validate specialty and language
    if (
      content.specialty &&
      !SUPPORTED_SPECIALTIES.includes(content.specialty as SupportedSpecialty)
    ) {
      errors.push({
        field: 'specialty',
        message: `Unsupported specialty: ${content.specialty}. Supported specialties: ${SUPPORTED_SPECIALTIES.join(', ')}`,
        code: VALIDATION_ERROR_CODES.INVALID_ENUM_VALUE,
        severity: 'error',
      });
    }

    if (
      content.language &&
      !SUPPORTED_LANGUAGES.includes(content.language as SupportedLanguage)
    ) {
      errors.push({
        field: 'language',
        message: `Unsupported language: ${content.language}. Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`,
        code: VALIDATION_ERROR_CODES.INVALID_ENUM_VALUE,
        severity: 'error',
      });
    }

    // Validate hero section consistency
    if (content.hero) {
      if (content.hero.trustIndicators.length < 2) {
        errors.push({
          field: 'hero.trustIndicators',
          message:
            'Hero section should have at least 2 trust indicators for better credibility',
          code: VALIDATION_ERROR_CODES.ARRAY_TOO_SHORT,
          severity: 'error',
        });
      }
    }

    // Validate problems section
    if (content.problems?.items) {
      if (content.problems.items.length < 3) {
        errors.push({
          field: 'problems.items',
          message:
            'Problems section should have at least 3 items for comprehensive coverage',
          code: VALIDATION_ERROR_CODES.ARRAY_TOO_SHORT,
          severity: 'error',
        });
      }
    }

    // Validate benefits section
    if (content.benefits?.items) {
      content.benefits.items.forEach((benefit, index) => {
        if (benefit.bullets.length < 2) {
          errors.push({
            field: `benefits.items[${index}].bullets`,
            message: 'Each benefit should have at least 2 bullet points',
            code: VALIDATION_ERROR_CODES.ARRAY_TOO_SHORT,
            severity: 'error',
          });
        }
      });
    }

    // Validate how it works steps sequence
    if (content.howItWorks?.steps) {
      const steps = content.howItWorks.steps
        .map((s) => s.step)
        .sort((a, b) => a - b);
      for (let i = 0; i < steps.length; i++) {
        if (steps[i] !== i + 1) {
          errors.push({
            field: 'howItWorks.steps',
            message: `Steps should be sequential starting from 1. Missing or duplicate step: ${i + 1}`,
            code: VALIDATION_ERROR_CODES.INVALID_FORMAT,
            severity: 'error',
          });
          break;
        }
      }
    }

    return errors;
  }

  /**
   * Validates business warnings (non-critical issues)
   */
  private validateBusinessWarnings(
    content: Partial<SpecialtyContent>
  ): ContentWarning[] {
    const warnings: ContentWarning[] = [];

    // Check for optimal content lengths
    if (content.hero?.headline && content.hero.headline.length < 30) {
      warnings.push({
        field: 'hero.headline',
        message: 'Headlines shorter than 30 characters may not be as effective',
        code: VALIDATION_WARNING_CODES.SUBOPTIMAL_LENGTH,
      });
    }

    if (content.hero?.description && content.hero.description.length < 100) {
      warnings.push({
        field: 'hero.description',
        message:
          'Hero descriptions shorter than 100 characters may lack detail',
        code: VALIDATION_WARNING_CODES.SUBOPTIMAL_LENGTH,
      });
    }

    // Check for missing optional but recommended fields
    if (content.testimonials?.items) {
      content.testimonials.items.forEach((testimonial, index) => {
        if (!testimonial.avatar) {
          warnings.push({
            field: `testimonials.items[${index}].avatar`,
            message: 'Testimonials with avatars are more credible',
            code: VALIDATION_WARNING_CODES.RECOMMENDED_FIELD_MISSING,
          });
        }
        if (!testimonial.rating) {
          warnings.push({
            field: `testimonials.items[${index}].rating`,
            message: 'Testimonials with ratings provide better social proof',
            code: VALIDATION_WARNING_CODES.RECOMMENDED_FIELD_MISSING,
          });
        }
      });
    }

    // Check for FAQ categorization
    if (content.faq?.items) {
      const uncategorized = content.faq.items.filter((faq) => !faq.category);
      if (uncategorized.length > 0) {
        warnings.push({
          field: 'faq.items',
          message: `${uncategorized.length} FAQ items are uncategorized. Categories improve organization`,
          code: VALIDATION_WARNING_CODES.RECOMMENDED_FIELD_MISSING,
        });
      }
    }

    return warnings;
  }

  /**
   * Validates references and consistency across sections
   */
  private validateReferences(content: SpecialtyContent): ContentError[] {
    const errors: ContentError[] = [];

    // Check for consistency in specialty terminology
    const specialtyTerms = this.extractSpecialtyTerms(content);
    if (specialtyTerms.size > 3) {
      errors.push({
        field: 'content',
        message: `Too many different specialty terms used (${Array.from(specialtyTerms).join(', ')}). Consider consistency`,
        code: VALIDATION_ERROR_CODES.INVALID_FORMAT,
        severity: 'error',
      });
    }

    // Validate icon consistency
    const allIcons = this.extractAllIcons(content);
    const duplicateIcons = this.findDuplicates(allIcons);
    if (duplicateIcons.length > 0) {
      errors.push({
        field: 'content',
        message: `Duplicate icons found: ${duplicateIcons.join(', ')}. Consider using unique icons for better UX`,
        code: VALIDATION_ERROR_CODES.INVALID_FORMAT,
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validates a specific section of content
   */
  private validateSection(
    _sectionName: string,
    _sectionData: any
  ): ContentError[] {
    // This would contain section-specific validation logic
    // For now, return empty array as sections are validated by main schema
    return [];
  }

  /**
   * Converts AJV validation errors to our ContentError format
   */
  private convertAjvErrors(ajvErrors: ErrorObject[]): ContentError[] {
    return ajvErrors.map((error) => ({
      field: error.instancePath || error.schemaPath,
      message: this.formatAjvErrorMessage(error),
      code: this.mapAjvErrorToCode(error.keyword),
      severity: 'error' as const,
    }));
  }

  /**
   * Formats AJV error messages for better readability
   */
  private formatAjvErrorMessage(error: ErrorObject): string {
    const field = error.instancePath.replace(/^\//, '').replace(/\//g, '.');

    switch (error.keyword) {
      case 'required':
        return `Missing required field: ${error.params?.missingProperty}`;
      case 'minLength':
        return `${field} is too short (minimum ${error.params?.limit} characters)`;
      case 'maxLength':
        return `${field} is too long (maximum ${error.params?.limit} characters)`;
      case 'pattern':
        return `${field} format is invalid`;
      case 'type':
        return `${field} should be ${error.params?.type}`;
      case 'minItems':
        return `${field} should have at least ${error.params?.limit} items`;
      case 'maxItems':
        return `${field} should have at most ${error.params?.limit} items`;
      default:
        return error.message || 'Validation error';
    }
  }

  /**
   * Maps AJV error keywords to our error codes
   */
  private mapAjvErrorToCode(keyword: string): string {
    const mapping: Record<string, string> = {
      required: VALIDATION_ERROR_CODES.REQUIRED_FIELD_MISSING,
      minLength: VALIDATION_ERROR_CODES.LENGTH_TOO_SHORT,
      maxLength: VALIDATION_ERROR_CODES.LENGTH_EXCEEDED,
      pattern: VALIDATION_ERROR_CODES.INVALID_PATTERN,
      type: VALIDATION_ERROR_CODES.INVALID_TYPE,
      minItems: VALIDATION_ERROR_CODES.ARRAY_TOO_SHORT,
      maxItems: VALIDATION_ERROR_CODES.ARRAY_TOO_LONG,
      enum: VALIDATION_ERROR_CODES.INVALID_ENUM_VALUE,
      additionalProperties: VALIDATION_ERROR_CODES.ADDITIONAL_PROPERTIES,
    };

    return mapping[keyword] || VALIDATION_ERROR_CODES.INVALID_FORMAT;
  }

  /**
   * Extracts specialty-related terms from content for consistency checking
   */
  private extractSpecialtyTerms(content: SpecialtyContent): Set<string> {
    const terms = new Set<string>();
    const text = JSON.stringify(content).toLowerCase();

    // Common medical specialty terms to look for
    const specialtyPatterns = [
      /clínica\s+\w+/g,
      /medicina\s+\w+/g,
      /\w+\s+médic[ao]/g,
      /especialidad\s+\w+/g,
    ];

    specialtyPatterns.forEach((pattern) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match) => terms.add(match.trim()));
      }
    });

    return terms;
  }

  /**
   * Extracts all icons used across content sections
   */
  private extractAllIcons(content: SpecialtyContent): string[] {
    const icons: string[] = [];

    // Hero trust indicators
    content.hero.trustIndicators.forEach((ti) => icons.push(ti.icon));

    // Problems
    content.problems.items.forEach((p) => icons.push(p.icon));

    // Benefits
    content.benefits.items.forEach((b) => icons.push(b.icon));

    // Features
    content.features.items.forEach((f) => icons.push(f.icon));

    // How it works
    content.howItWorks.steps.forEach((s) => icons.push(s.icon));

    return icons;
  }

  /**
   * Finds duplicate values in an array
   */
  private findDuplicates<T>(array: T[]): T[] {
    const seen = new Set<T>();
    const duplicates = new Set<T>();

    array.forEach((item) => {
      if (seen.has(item)) {
        duplicates.add(item);
      } else {
        seen.add(item);
      }
    });

    return Array.from(duplicates);
  }
}

/**
 * Convenience function to validate content with default options
 */
export function validateContent(
  content: Partial<SpecialtyContent>,
  options?: ContentValidationOptions
): ValidationResult {
  const validator = new ContentValidator(options);
  return validator.validate(content);
}

/**
 * Validates only the structure without business rules
 */
export function validateContentStructure(
  content: Partial<SpecialtyContent>
): ValidationResult {
  const validator = new ContentValidator({
    strict: false,
    allowPartial: true,
    validateReferences: false,
  });
  return validator.validate(content);
}

/**
 * Quick validation for required fields only
 */
export function validateRequiredFields(
  content: Partial<SpecialtyContent>
): ValidationResult {
  const validator = new ContentValidator({
    strict: true,
    allowPartial: false,
    validateReferences: false,
  });
  return validator.validate(content);
}
