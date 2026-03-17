/**
 * Content Configuration Types for Landing Page Generalization
 *
 * These interfaces define the structure for specialty-specific content
 * that can be configured for different medical specialties while
 * maintaining type safety and consistency across the application.
 */

// Base content metadata
export interface ContentMetadata {
  version: string;
  lastUpdated: string;
  author?: string;
  description?: string;
  tags?: string[];
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: ContentError[];
  warnings?: ContentWarning[];
}

export interface ContentError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ContentWarning {
  field: string;
  message: string;
  code: string;
}

// Trust indicators for hero section
export interface TrustIndicator {
  icon: string;
  text: string;
}

// Hero section content
export interface HeroContent {
  headline: string;
  description: string;
  primaryCTA: string;
  secondaryCTA: string;
  trustIndicators: TrustIndicator[];
}

// Problem section content
export interface ProblemContent {
  icon: string;
  title: string;
  description: string;
}

// Benefit section content
export interface BenefitContent {
  icon: string;
  title: string;
  description: string;
  bullets: string[];
}

// Feature section content
export interface FeatureContent {
  icon: string;
  title: string;
  description: string;
  details?: string[];
  image?: string;
}

// How it works section content
export interface HowItWorksStep {
  step: number;
  title: string;
  description: string;
  icon: string;
}

export interface HowItWorksContent {
  title: string;
  description: string;
  steps: HowItWorksStep[];
}

// Testimonial content
export interface TestimonialContent {
  name: string;
  role: string;
  company: string;
  content: string;
  avatar?: string;
  rating?: number;
}

// FAQ content
export interface FAQContent {
  question: string;
  answer: string;
  category?: string;
}

// CTA section content
export interface CTAContent {
  title: string;
  description: string;
  primaryCTA: string;
  secondaryCTA?: string;
  features?: string[];
}

// Customer profile content
export interface CustomerProfile {
  name: string;
  specialty: string;
  description: string;
  image?: string;
  metrics?: {
    label: string;
    value: string;
  }[];
}

// Pricing content
export interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaText: string;
}

export interface PricingContent {
  title: string;
  description: string;
  tiers: PricingTier[];
  faqLink?: string;
}

// Main specialty content interface
export interface SpecialtyContent {
  specialty: string;
  language: string;
  hero: HeroContent;
  problems: {
    title: string;
    description: string;
    items: ProblemContent[];
  };
  benefits: {
    title: string;
    description: string;
    items: BenefitContent[];
  };
  features: {
    title: string;
    description: string;
    items: FeatureContent[];
  };
  howItWorks: HowItWorksContent;
  testimonials: {
    title: string;
    description: string;
    items: TestimonialContent[];
  };
  customerProfiles: {
    title: string;
    description: string;
    items: CustomerProfile[];
  };
  pricing: PricingContent;
  faq: {
    title: string;
    description: string;
    items: FAQContent[];
  };
  cta: CTAContent;
  metadata: ContentMetadata;
}

// Content loading and management types
export interface ContentLoadOptions {
  specialty: string;
  language?: string;
  fallbackToGeneric?: boolean;
  useCache?: boolean;
}

export interface ContentCacheEntry {
  content: SpecialtyContent;
  timestamp: number;
  ttl: number;
}

export interface ContentSource {
  type: 'file' | 'api' | 'cache' | 'fallback';
  path?: string;
  url?: string;
  priority: number;
}

// Content validation schema types
export interface ContentSchema {
  $schema: string;
  type: string;
  required: string[];
  properties: Record<string, any>;
  additionalProperties?: boolean;
}

export interface ContentValidationOptions {
  strict?: boolean;
  allowPartial?: boolean;
  validateReferences?: boolean;
  maxLength?: Record<string, number>;
}

// Content management types
export interface ContentUpdateRequest {
  specialty: string;
  language: string;
  content: Partial<SpecialtyContent>;
  author: string;
  comment?: string;
}

export interface ContentVersion {
  id: string;
  specialty: string;
  language: string;
  version: string;
  content: SpecialtyContent;
  createdAt: string;
  createdBy: string;
  comment?: string;
}

// Error types for content operations
export class ContentLoadError extends Error {
  constructor(
    message: string,
    public specialty: string,
    public language: string,
    public source?: ContentSource
  ) {
    super(message);
    this.name = 'ContentLoadError';
  }
}

export class ContentValidationError extends Error {
  constructor(
    message: string,
    public errors: ContentError[],
    public content?: Partial<SpecialtyContent>
  ) {
    super(message);
    this.name = 'ContentValidationError';
  }
}

export class ContentNotFoundError extends Error {
  constructor(
    message: string,
    public specialty: string,
    public language: string
  ) {
    super(message);
    this.name = 'ContentNotFoundError';
  }
}

// Utility types for content operations
export type ContentSection = keyof Omit<
  SpecialtyContent,
  'specialty' | 'language' | 'metadata'
>;

export type PartialSpecialtyContent = Partial<SpecialtyContent> & {
  specialty: string;
  language: string;
};

export type ContentUpdatePayload<T extends ContentSection> = {
  section: T;
  data: SpecialtyContent[T];
};

// Content provider context types
export interface ContentContextValue {
  content: SpecialtyContent | null;
  specialty: string;
  language: string;
  isLoading: boolean;
  error: string | null;
  loadContent: (options: ContentLoadOptions) => Promise<void>;
  updateContent: (updates: Partial<SpecialtyContent>) => Promise<void>;
  validateContent: (content: Partial<SpecialtyContent>) => ValidationResult;
}

export interface ContentProviderProps {
  specialty?: string;
  language?: string;
  children: React.ReactNode;
  fallbackContent?: SpecialtyContent;
}
