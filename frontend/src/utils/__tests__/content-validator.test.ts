/**
 * Tests for content validation system
 */

import { ContentValidator, validateContent } from '../content-validator';
import { SpecialtyContent } from '../../types/content';

describe('ContentValidator', () => {
  const validContent: SpecialtyContent = {
    specialty: 'aesthetic-medicine',
    language: 'es',
    hero: {
      headline: 'Gestiona tu clínica estética con claridad total',
      description:
        'La plataforma integral para profesionales de medicina estética. Organiza citas, historiales y operaciones en un solo lugar.',
      primaryCTA: 'Comenzar prueba gratis',
      secondaryCTA: 'Agendar una demo',
      trustIndicators: [
        { icon: 'shield', text: 'Datos seguros' },
        { icon: 'clock', text: '99.9% uptime' },
        { icon: 'sparkles', text: 'Diseñado para estética' },
      ],
    },
    problems: {
      title: 'El caos diario en clínicas estéticas',
      description: 'Reconoces estos problemas? No estás solo.',
      items: [
        {
          icon: 'calendar',
          title: 'Conflictos de agenda',
          description:
            'Citas duplicadas, solapamientos y confusión entre proveedores y salas.',
        },
        {
          icon: 'file-text',
          title: 'Registros dispersos',
          description:
            'Historiales en papel, WhatsApp y hojas de cálculo. Imposible tener visión completa.',
        },
        {
          icon: 'users',
          title: 'Múltiples proveedores',
          description:
            'Coordinar calendarios de varios profesionales es una pesadilla.',
        },
      ],
    },
    benefits: {
      title: 'Por qué elegir Atriax',
      description:
        'Construido específicamente para las necesidades de medicina estética.',
      items: [
        {
          icon: 'calendar',
          title: 'Un calendario para toda la clínica',
          description:
            'Visualiza la disponibilidad de todos tus proveedores y salas en tiempo real.',
          bullets: [
            'Vista unificada multi-proveedor',
            'Gestión de salas y equipos',
            'Recordatorios automáticos',
          ],
        },
        {
          icon: 'users',
          title: 'Cada detalle del paciente en un lugar',
          description:
            'Perfiles completos con historial, fotos antes/después, consentimientos.',
          bullets: [
            'Fotos antes/después organizadas',
            'Formularios de consentimiento digitales',
          ],
        },
      ],
    },
    features: {
      title: 'Características principales',
      description: 'Todo lo que necesitas para gestionar tu clínica',
      items: [
        {
          icon: 'calendar',
          title: 'Gestión de citas',
          description: 'Sistema completo de reservas y calendario',
        },
      ],
    },
    howItWorks: {
      title: 'Cómo funciona',
      description: 'Tres pasos simples para empezar',
      steps: [
        {
          step: 1,
          title: 'Configura tu clínica',
          description: 'Añade proveedores, salas y servicios',
          icon: 'settings',
        },
        {
          step: 2,
          title: 'Invita a tu equipo',
          description: 'Colabora con todo tu personal',
          icon: 'users',
        },
      ],
    },
    testimonials: {
      title: 'Lo que dicen nuestros clientes',
      description: 'Testimonios reales de profesionales',
      items: [
        {
          name: 'Dr. María García',
          role: 'Directora',
          company: 'Clínica Estética Madrid',
          content: 'Atriax ha transformado completamente nuestra operación.',
          rating: 5,
        },
      ],
    },
    customerProfiles: {
      title: 'Nuestros clientes',
      description: 'Profesionales que confían en nosotros',
      items: [
        {
          name: 'Clínica Premium',
          specialty: 'Medicina Estética',
          description: 'Clínica líder en tratamientos estéticos',
        },
      ],
    },
    pricing: {
      title: 'Planes y precios',
      description: 'Elige el plan perfecto para tu clínica',
      tiers: [
        {
          name: 'Básico',
          price: '€49',
          period: 'mes',
          description: 'Perfecto para clínicas pequeñas',
          features: ['Hasta 2 proveedores', 'Calendario básico'],
          ctaText: 'Empezar gratis',
        },
      ],
    },
    faq: {
      title: 'Preguntas frecuentes',
      description: 'Respuestas a las dudas más comunes',
      items: [
        {
          question: '¿Es seguro almacenar datos médicos?',
          answer:
            'Sí, cumplimos con todas las normativas de protección de datos.',
          category: 'seguridad',
        },
      ],
    },
    cta: {
      title: 'Empieza hoy mismo',
      description: 'Únete a cientos de clínicas que ya usan Atriax',
      primaryCTA: 'Comenzar prueba gratis',
      features: ['14 días gratis', 'Sin compromiso'],
    },
    metadata: {
      version: '1.0.0',
      lastUpdated: '2024-01-15T10:00:00Z',
      author: 'Content Team',
      description: 'Aesthetic medicine specialty content',
      tags: ['aesthetic', 'medicine', 'spanish'],
    },
  };

  describe('validateContent', () => {
    it('should validate correct content successfully', () => {
      const result = validateContent(validContent);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidContent = { ...validContent };
      delete (invalidContent as any).hero;

      const result = validateContent(invalidContent);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('hero'))).toBe(true);
    });

    it('should detect invalid specialty', () => {
      const invalidContent = {
        ...validContent,
        specialty: 'invalid-specialty',
      };

      const result = validateContent(invalidContent);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'specialty')).toBe(true);
    });

    it('should detect invalid language', () => {
      const invalidContent = {
        ...validContent,
        language: 'invalid',
      };

      const result = validateContent(invalidContent);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'language')).toBe(true);
    });

    it('should detect too few trust indicators', () => {
      const invalidContent = {
        ...validContent,
        hero: {
          ...validContent.hero,
          trustIndicators: [{ icon: 'shield', text: 'Datos seguros' }],
        },
      };

      const result = validateContent(invalidContent);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.field.includes('trustIndicators'))
      ).toBe(true);
    });

    it('should detect invalid step sequence', () => {
      const invalidContent = {
        ...validContent,
        howItWorks: {
          ...validContent.howItWorks,
          steps: [
            {
              step: 1,
              title: 'First step',
              description: 'Description',
              icon: 'icon1',
            },
            {
              step: 3, // Missing step 2
              title: 'Third step',
              description: 'Description',
              icon: 'icon3',
            },
          ],
        },
      };

      const result = validateContent(invalidContent);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('steps'))).toBe(true);
    });

    it('should generate warnings for missing optional fields', () => {
      const contentWithoutOptionals = {
        ...validContent,
        testimonials: {
          ...validContent.testimonials,
          items: [
            {
              name: 'Dr. Test',
              role: 'Doctor',
              company: 'Test Clinic',
              content: 'Great platform for managing our clinic operations.',
              // Missing avatar and rating
            },
          ],
        },
      };

      const result = validateContent(contentWithoutOptionals);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });
  });

  describe('ContentValidator class', () => {
    it('should support partial validation', () => {
      const validator = new ContentValidator({ allowPartial: true });
      const partialContent = {
        specialty: 'aesthetic-medicine',
        language: 'es',
        hero: validContent.hero,
      };

      const result = validator.validate(partialContent);
      expect(result.isValid).toBe(true);
    });

    it('should validate with custom options', () => {
      const validator = new ContentValidator({
        strict: false,
        validateReferences: false,
      });

      const result = validator.validate(validContent);
      expect(result.isValid).toBe(true);
    });
  });
});
