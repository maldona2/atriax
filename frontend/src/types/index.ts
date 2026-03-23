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

// Treatment types
export type {
  Treatment,
  PatientTreatment,
  TreatmentLineItem,
} from './treatments';

// Session photo types
export interface SessionPhoto {
  id: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  uploaded_at: string | null;
  presigned_url: string;
}

// Appointment types
export interface Appointment {
  id: string;
  tenant_id: string;
  patient_id: string;
  scheduled_at: string;
  duration_minutes: number | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'unpaid' | 'paid' | 'partial' | 'refunded';
  total_amount_cents: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  patient_first_name?: string;
  patient_last_name?: string;
}

export interface AppointmentTreatmentRow {
  id: string;
  treatment_id: string;
  treatment_name: string;
  quantity: number;
  unit_price_cents: number;
}

export interface AppointmentDetail extends Appointment {
  procedures_performed?: string | null;
  recommendations?: string | null;
  session_id?: string | null;
  treatments?: AppointmentTreatmentRow[];
}

export interface PreviousSession {
  id: string;
  appointment_id: string;
  scheduled_at: string;
  procedures_performed: string;
  recommendations: string | null;
  created_at: string | null;
}

export interface AppointmentDetailExtended extends AppointmentDetail {
  patient_phone: string | null;
  patient_email: string | null;
  patient_date_of_birth: string | null;
  patient_notes: string | null;
  photos?: SessionPhoto[];
  previous_sessions?: PreviousSession[];
}

// Patient types
export interface Patient {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PatientDetail extends Patient {
  appointment_count?: number;
  unpaid_count?: number;
  unpaid_total_cents?: number;
}

// Admin types
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string | null;
  user_email?: string;
  subscription_plan?: 'free' | 'pro' | 'gold';
  subscription_status?: 'active' | 'paused' | 'cancelled';
}
