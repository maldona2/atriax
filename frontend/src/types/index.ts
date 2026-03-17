/**
 * Content configuration types and utilities
 *
 * This module exports all content-related types, schemas, and validation utilities
 * for the landing page generalization system.
 */

// Core content types
export type {
  SpecialtyContent,
  HeroContent,
  ProblemContent,
  BenefitContent,
  FeatureContent,
  HowItWorksContent,
  HowItWorksStep,
  TestimonialContent,
  FAQContent,
  CTAContent,
  CustomerProfile,
  PricingContent,
  PricingTier,
  TrustIndicator,
  ContentMetadata,
  ValidationResult,
  ContentError,
  ContentWarning,
  ContentLoadOptions,
  ContentCacheEntry,
  ContentSource,
  ContentSchema,
  ContentValidationOptions,
  ContentUpdateRequest,
  ContentVersion,
  ContentContextValue,
  ContentProviderProps,
  ContentSection,
  PartialSpecialtyContent,
  ContentUpdatePayload,
} from './content';

// Error classes
export {
  ContentLoadError,
  ContentValidationError,
  ContentNotFoundError,
} from './content';

// Schema and validation
export {
  specialtyContentSchema,
  CONTENT_LIMITS,
  VALIDATION_ERROR_CODES,
  VALIDATION_WARNING_CODES,
  SUPPORTED_LANGUAGES,
  SUPPORTED_SPECIALTIES,
} from '../schemas/content-schema';

export type {
  SupportedLanguage,
  SupportedSpecialty,
} from '../schemas/content-schema';

// Validation utilities
export {
  ContentValidator,
  validateContent,
  validateContentStructure,
  validateRequiredFields,
} from '../utils/content-validator';
