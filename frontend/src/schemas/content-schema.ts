/**
 * JSON Schema definitions for content validation
 *
 * These schemas define the structure and validation rules for specialty content
 * to ensure consistency and completeness across all medical specialties.
 */

// JSON Schema type definition
export interface ContentSchema {
  $schema: string;
  type: string;
  required: string[];
  properties: Record<string, any>;
  additionalProperties?: boolean;
}

// Character limits for different content fields
export const CONTENT_LIMITS = {
  headline: 100,
  shortDescription: 200,
  longDescription: 500,
  title: 80,
  bulletPoint: 150,
  ctaText: 50,
  name: 100,
  role: 80,
  company: 100,
} as const;

// Trust indicator schema
const trustIndicatorSchema = {
  type: 'object',
  required: ['icon', 'text'],
  properties: {
    icon: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
    },
    text: {
      type: 'string',
      minLength: 1,
      maxLength: CONTENT_LIMITS.bulletPoint,
    },
  },
  additionalProperties: false,
};

// Hero content schema
const heroContentSchema = {
  type: 'object',
  required: [
    'headline',
    'description',
    'primaryCTA',
    'secondaryCTA',
    'trustIndicators',
  ],
  properties: {
    headline: {
      type: 'string',
      minLength: 10,
      maxLength: CONTENT_LIMITS.headline,
    },
    description: {
      type: 'string',
      minLength: 20,
      maxLength: CONTENT_LIMITS.longDescription,
    },
    primaryCTA: {
      type: 'string',
      minLength: 5,
      maxLength: CONTENT_LIMITS.ctaText,
    },
    secondaryCTA: {
      type: 'string',
      minLength: 5,
      maxLength: CONTENT_LIMITS.ctaText,
    },
    trustIndicators: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: trustIndicatorSchema,
    },
  },
  additionalProperties: false,
};

// Problem content schema
const problemContentSchema = {
  type: 'object',
  required: ['icon', 'title', 'description'],
  properties: {
    icon: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
    },
    title: {
      type: 'string',
      minLength: 5,
      maxLength: CONTENT_LIMITS.title,
    },
    description: {
      type: 'string',
      minLength: 10,
      maxLength: CONTENT_LIMITS.shortDescription,
    },
  },
  additionalProperties: false,
};

// Benefit content schema
const benefitContentSchema = {
  type: 'object',
  required: ['icon', 'title', 'description', 'bullets'],
  properties: {
    icon: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
    },
    title: {
      type: 'string',
      minLength: 5,
      maxLength: CONTENT_LIMITS.title,
    },
    description: {
      type: 'string',
      minLength: 10,
      maxLength: CONTENT_LIMITS.longDescription,
    },
    bullets: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: {
        type: 'string',
        minLength: 5,
        maxLength: CONTENT_LIMITS.bulletPoint,
      },
    },
  },
  additionalProperties: false,
};

// Feature content schema
const featureContentSchema = {
  type: 'object',
  required: ['icon', 'title', 'description'],
  properties: {
    icon: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
    },
    title: {
      type: 'string',
      minLength: 5,
      maxLength: CONTENT_LIMITS.title,
    },
    description: {
      type: 'string',
      minLength: 10,
      maxLength: CONTENT_LIMITS.longDescription,
    },
    details: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 5,
        maxLength: CONTENT_LIMITS.bulletPoint,
      },
    },
    image: {
      type: 'string',
      format: 'uri',
    },
  },
  additionalProperties: false,
};

// How it works step schema
const howItWorksStepSchema = {
  type: 'object',
  required: ['step', 'title', 'description', 'icon'],
  properties: {
    step: {
      type: 'integer',
      minimum: 1,
      maximum: 10,
    },
    title: {
      type: 'string',
      minLength: 5,
      maxLength: CONTENT_LIMITS.title,
    },
    description: {
      type: 'string',
      minLength: 10,
      maxLength: CONTENT_LIMITS.shortDescription,
    },
    icon: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
    },
  },
  additionalProperties: false,
};

// How it works content schema
const howItWorksContentSchema = {
  type: 'object',
  required: ['title', 'description', 'steps'],
  properties: {
    title: {
      type: 'string',
      minLength: 5,
      maxLength: CONTENT_LIMITS.title,
    },
    description: {
      type: 'string',
      minLength: 10,
      maxLength: CONTENT_LIMITS.shortDescription,
    },
    steps: {
      type: 'array',
      minItems: 2,
      maxItems: 6,
      items: howItWorksStepSchema,
    },
  },
  additionalProperties: false,
};

// Testimonial content schema
const testimonialContentSchema = {
  type: 'object',
  required: ['name', 'role', 'company', 'content'],
  properties: {
    name: {
      type: 'string',
      minLength: 2,
      maxLength: CONTENT_LIMITS.name,
    },
    role: {
      type: 'string',
      minLength: 2,
      maxLength: CONTENT_LIMITS.role,
    },
    company: {
      type: 'string',
      minLength: 2,
      maxLength: CONTENT_LIMITS.company,
    },
    content: {
      type: 'string',
      minLength: 20,
      maxLength: CONTENT_LIMITS.longDescription,
    },
    avatar: {
      type: 'string',
      format: 'uri',
    },
    rating: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
    },
  },
  additionalProperties: false,
};

// FAQ content schema
const faqContentSchema = {
  type: 'object',
  required: ['question', 'answer'],
  properties: {
    question: {
      type: 'string',
      minLength: 10,
      maxLength: CONTENT_LIMITS.title,
    },
    answer: {
      type: 'string',
      minLength: 20,
      maxLength: CONTENT_LIMITS.longDescription,
    },
    category: {
      type: 'string',
      minLength: 2,
      maxLength: 50,
    },
  },
  additionalProperties: false,
};

// CTA content schema
const ctaContentSchema = {
  type: 'object',
  required: ['title', 'description', 'primaryCTA'],
  properties: {
    title: {
      type: 'string',
      minLength: 5,
      maxLength: CONTENT_LIMITS.title,
    },
    description: {
      type: 'string',
      minLength: 10,
      maxLength: CONTENT_LIMITS.shortDescription,
    },
    primaryCTA: {
      type: 'string',
      minLength: 5,
      maxLength: CONTENT_LIMITS.ctaText,
    },
    secondaryCTA: {
      type: 'string',
      minLength: 5,
      maxLength: CONTENT_LIMITS.ctaText,
    },
    features: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 5,
        maxLength: CONTENT_LIMITS.bulletPoint,
      },
    },
  },
  additionalProperties: false,
};

// Customer profile schema
const customerProfileSchema = {
  type: 'object',
  required: ['name', 'specialty', 'description'],
  properties: {
    name: {
      type: 'string',
      minLength: 2,
      maxLength: CONTENT_LIMITS.name,
    },
    specialty: {
      type: 'string',
      minLength: 2,
      maxLength: CONTENT_LIMITS.role,
    },
    description: {
      type: 'string',
      minLength: 10,
      maxLength: CONTENT_LIMITS.shortDescription,
    },
    image: {
      type: 'string',
      format: 'uri',
    },
    metrics: {
      type: 'array',
      items: {
        type: 'object',
        required: ['label', 'value'],
        properties: {
          label: {
            type: 'string',
            minLength: 2,
            maxLength: 50,
          },
          value: {
            type: 'string',
            minLength: 1,
            maxLength: 20,
          },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

// Pricing tier schema
const pricingTierSchema = {
  type: 'object',
  required: ['name', 'price', 'period', 'description', 'features', 'ctaText'],
  properties: {
    name: {
      type: 'string',
      minLength: 2,
      maxLength: 50,
    },
    price: {
      type: 'string',
      minLength: 1,
      maxLength: 20,
    },
    period: {
      type: 'string',
      minLength: 2,
      maxLength: 20,
    },
    description: {
      type: 'string',
      minLength: 10,
      maxLength: CONTENT_LIMITS.shortDescription,
    },
    features: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'string',
        minLength: 5,
        maxLength: CONTENT_LIMITS.bulletPoint,
      },
    },
    highlighted: {
      type: 'boolean',
    },
    ctaText: {
      type: 'string',
      minLength: 5,
      maxLength: CONTENT_LIMITS.ctaText,
    },
  },
  additionalProperties: false,
};

// Pricing content schema
const pricingContentSchema = {
  type: 'object',
  required: ['title', 'description', 'tiers'],
  properties: {
    title: {
      type: 'string',
      minLength: 5,
      maxLength: CONTENT_LIMITS.title,
    },
    description: {
      type: 'string',
      minLength: 10,
      maxLength: CONTENT_LIMITS.shortDescription,
    },
    tiers: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: pricingTierSchema,
    },
    faqLink: {
      type: 'string',
      format: 'uri',
    },
  },
  additionalProperties: false,
};

// Content metadata schema
const contentMetadataSchema = {
  type: 'object',
  required: ['version', 'lastUpdated'],
  properties: {
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+$',
    },
    lastUpdated: {
      type: 'string',
      format: 'date-time',
    },
    author: {
      type: 'string',
      minLength: 2,
      maxLength: CONTENT_LIMITS.name,
    },
    description: {
      type: 'string',
      minLength: 10,
      maxLength: CONTENT_LIMITS.shortDescription,
    },
    tags: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 2,
        maxLength: 30,
      },
    },
  },
  additionalProperties: false,
};

// Section wrapper schema helper
const createSectionSchema = (itemSchema: any) => ({
  type: 'object',
  required: ['title', 'description', 'items'],
  properties: {
    title: {
      type: 'string',
      minLength: 5,
      maxLength: CONTENT_LIMITS.title,
    },
    description: {
      type: 'string',
      minLength: 10,
      maxLength: CONTENT_LIMITS.shortDescription,
    },
    items: {
      type: 'array',
      minItems: 1,
      items: itemSchema,
    },
  },
  additionalProperties: false,
});

// Main specialty content schema
export const specialtyContentSchema: ContentSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: [
    'specialty',
    'language',
    'hero',
    'problems',
    'benefits',
    'features',
    'howItWorks',
    'testimonials',
    'customerProfiles',
    'pricing',
    'faq',
    'cta',
    'metadata',
  ],
  properties: {
    specialty: {
      type: 'string',
      pattern: '^[a-z][a-z0-9-]*[a-z0-9]$',
      minLength: 2,
      maxLength: 50,
    },
    language: {
      type: 'string',
      pattern: '^[a-z]{2}(-[A-Z]{2})?$',
    },
    hero: heroContentSchema,
    problems: createSectionSchema(problemContentSchema),
    benefits: createSectionSchema(benefitContentSchema),
    features: createSectionSchema(featureContentSchema),
    howItWorks: howItWorksContentSchema,
    testimonials: createSectionSchema(testimonialContentSchema),
    customerProfiles: createSectionSchema(customerProfileSchema),
    pricing: pricingContentSchema,
    faq: createSectionSchema(faqContentSchema),
    cta: ctaContentSchema,
    metadata: contentMetadataSchema,
  },
  additionalProperties: false,
};

// Validation error codes
export const VALIDATION_ERROR_CODES = {
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT: 'INVALID_FORMAT',
  LENGTH_EXCEEDED: 'LENGTH_EXCEEDED',
  LENGTH_TOO_SHORT: 'LENGTH_TOO_SHORT',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_PATTERN: 'INVALID_PATTERN',
  ARRAY_TOO_SHORT: 'ARRAY_TOO_SHORT',
  ARRAY_TOO_LONG: 'ARRAY_TOO_LONG',
  INVALID_ENUM_VALUE: 'INVALID_ENUM_VALUE',
  ADDITIONAL_PROPERTIES: 'ADDITIONAL_PROPERTIES',
} as const;

// Validation warning codes
export const VALIDATION_WARNING_CODES = {
  RECOMMENDED_FIELD_MISSING: 'RECOMMENDED_FIELD_MISSING',
  SUBOPTIMAL_LENGTH: 'SUBOPTIMAL_LENGTH',
  DEPRECATED_FIELD: 'DEPRECATED_FIELD',
  PERFORMANCE_CONCERN: 'PERFORMANCE_CONCERN',
} as const;

// Schema validation utilities
export const SUPPORTED_LANGUAGES = [
  'es',
  'en',
  'fr',
  'de',
  'it',
  'pt',
] as const;
export const SUPPORTED_SPECIALTIES = [
  'aesthetic-medicine',
  'cardiology',
  'dermatology',
  'pediatrics',
  'orthopedics',
  'neurology',
  'psychiatry',
  'general-medicine',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type SupportedSpecialty = (typeof SUPPORTED_SPECIALTIES)[number];
