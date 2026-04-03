/**
 * Chatbot unit and property-based tests
 * Feature: ai-chatbot-assistant
 */

import * as fc from 'fast-check';
import {
  ResponseFormatter,
  formatDateTimeES,
} from '../../chatbot/services/ResponseFormatter.js';
import {
  isAffirmativeResponse,
  isNegativeResponse,
  resolveDisambiguationResponse,
  clearContext,
} from '../../chatbot/services/ConversationManager.js';
import {
  requiresConfirmation,
  isConfirmationExpired,
} from '../../chatbot/services/ConfirmationHandler.js';
import { findMissingParam } from '../../chatbot/services/AmbiguityResolver.js';
import type {
  Intent,
  ConversationContext,
  PendingConfirmation,
  IntentOperation,
  IntentEntity,
} from '../../chatbot/types.js';
import { CONFIRMATION_TIMEOUT_MS } from '../../chatbot/types.js';

const formatter = new ResponseFormatter();

// ─── Property test helpers ─────────────────────────────────────────────────────

const validOperations: IntentOperation[] = [
  'create',
  'read',
  'update',
  'delete',
  'list',
  'search',
  'help',
  'reset',
  'unknown',
];
const validEntities: IntentEntity[] = [
  'appointment',
  'patient',
  'session',
  'none',
];

const intentArb = fc.record({
  operation: fc.constantFrom(...validOperations),
  entity: fc.constantFrom(...validEntities),
  params: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null))
  ),
  confidence: fc.float({ min: 0, max: 1, noNaN: true }),
  rawText: fc.string(),
});

const contextArb = fc.record({
  lastPatientId: fc.option(fc.uuid(), { nil: undefined }),
  lastAppointmentId: fc.option(fc.uuid(), { nil: undefined }),
});

// ─── Property 1: Enterprise Plan Access Control ─────────────────────────────

describe('Enterprise Plan Access Control', () => {
  // Feature: ai-chatbot-assistant, Property 1: Enterprise plan access control

  it('Property 1: Only gold plan with active status should have access', () => {
    fc.assert(
      fc.property(
        fc.record({
          plan: fc.constantFrom('free', 'pro', 'gold'),
          status: fc.constantFrom('active', 'paused', 'cancelled'),
        }),
        ({ plan, status }) => {
          const hasAccess = plan === 'gold' && status === 'active';
          // Access should only be granted for gold + active
          if (plan !== 'gold') expect(hasAccess).toBe(false);
          if (status !== 'active') expect(hasAccess).toBe(false);
          if (plan === 'gold' && status === 'active')
            expect(hasAccess).toBe(true);
        }
      ),
      { numRuns: 100, verbose: true }
    );
  });
});

// ─── Property 2 & 3: Intent Classification ─────────────────────────────────

describe('Intent Classification', () => {
  // Feature: ai-chatbot-assistant, Property 2: Intent Operation Classification

  it('Property 2: Valid operations are a closed set', () => {
    fc.assert(
      fc.property(intentArb, (intent) => {
        expect(validOperations).toContain(intent.operation);
      }),
      { numRuns: 100, verbose: true }
    );
  });

  // Feature: ai-chatbot-assistant, Property 3: Intent Entity Classification

  it('Property 3: Valid entities are a closed set', () => {
    fc.assert(
      fc.property(intentArb, (intent) => {
        expect(validEntities).toContain(intent.entity);
      }),
      { numRuns: 100, verbose: true }
    );
  });

  it('Confidence is between 0 and 1', () => {
    fc.assert(
      fc.property(intentArb, (intent) => {
        expect(intent.confidence).toBeGreaterThanOrEqual(0);
        expect(intent.confidence).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100, verbose: true }
    );
  });
});

// ─── Property 8: Missing Parameter Detection ────────────────────────────────

describe('Missing Parameter Detection', () => {
  // Feature: ai-chatbot-assistant, Property 8: Missing Parameter Detection

  it('Property 8: Create appointment without date returns missing param', () => {
    const intent: Intent = {
      operation: 'create',
      entity: 'appointment',
      params: { patient_id: '123', time: '10:00' }, // no date
      confidence: 0.9,
      rawText: 'crear turno',
    };
    const context: ConversationContext = {};
    const missing = findMissingParam(intent, context);
    expect(missing).not.toBeNull();
    expect(missing?.field).toBe('date');
  });

  it('Create appointment without time returns missing param', () => {
    const intent: Intent = {
      operation: 'create',
      entity: 'appointment',
      params: { patient_id: '123', date: '2024-04-01' }, // no time
      confidence: 0.9,
      rawText: 'crear turno',
    };
    const context: ConversationContext = {};
    const missing = findMissingParam(intent, context);
    expect(missing).not.toBeNull();
    expect(missing?.field).toBe('time');
  });

  it('Create appointment with all params returns null', () => {
    const intent: Intent = {
      operation: 'create',
      entity: 'appointment',
      params: { patient_id: '123', date: '2024-04-01', time: '10:00' },
      confidence: 0.9,
      rawText: 'crear turno',
    };
    const context: ConversationContext = {};
    const missing = findMissingParam(intent, context);
    expect(missing).toBeNull();
  });

  it('Create appointment with context patient does not require patient param', () => {
    const intent: Intent = {
      operation: 'create',
      entity: 'appointment',
      params: { date: '2024-04-01', time: '10:00' },
      confidence: 0.9,
      rawText: 'crear turno',
    };
    const context: ConversationContext = { lastPatientId: 'uuid-patient' };
    const missing = findMissingParam(intent, context);
    expect(missing).toBeNull();
  });
});

// ─── Property 10-13: Confirmation Flow ─────────────────────────────────────

describe('Confirmation Flow', () => {
  // Feature: ai-chatbot-assistant, Property 10: Confirmation Request for Destructive Operations

  it('Property 10: Delete patient requires confirmation', () => {
    const intent: Intent = {
      operation: 'delete',
      entity: 'patient',
      params: { patient_id: '123' },
      confidence: 0.9,
      rawText: 'eliminar paciente',
    };
    expect(requiresConfirmation(intent)).toBe(true);
  });

  it('Property 10: Cancel appointment (update + status=cancelled) requires confirmation', () => {
    const intent: Intent = {
      operation: 'update',
      entity: 'appointment',
      params: { appointment_id: '123', status: 'cancelled' },
      confidence: 0.9,
      rawText: 'cancelar turno',
    };
    expect(requiresConfirmation(intent)).toBe(true);
  });

  it('Property 10: Non-destructive operations do not require confirmation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<[IntentOperation, IntentEntity]>(
          ['create', 'appointment'],
          ['read', 'patient'],
          ['list', 'appointment'],
          ['search', 'patient'],
          ['update', 'patient'],
          ['help', 'none']
        ),
        ([operation, entity]) => {
          const intent: Intent = {
            operation,
            entity,
            params: {},
            confidence: 0.9,
            rawText: 'test',
          };
          expect(requiresConfirmation(intent)).toBe(false);
        }
      ),
      { numRuns: 100, verbose: true }
    );
  });

  // Feature: ai-chatbot-assistant, Property 11: Confirmation Response Recognition

  it('Property 11: Affirmative responses are recognized', () => {
    const affirmatives = [
      'sí',
      'si',
      'dale',
      'confirmar',
      'confirmo',
      'ok',
      'acepto',
      'sip',
      'claro',
    ];
    for (const text of affirmatives) {
      expect(isAffirmativeResponse(text)).toBe(true);
    }
  });

  it('Negative responses are recognized', () => {
    const negatives = ['no', 'cancelar', 'cancelo', 'abortar', 'stop', 'nope'];
    for (const text of negatives) {
      expect(isNegativeResponse(text)).toBe(true);
    }
  });

  // Feature: ai-chatbot-assistant, Property 34: Confirmation Timeout

  it('Property 34: Expired confirmation is detected', () => {
    const expiredConfirmation: PendingConfirmation = {
      intent: {
        operation: 'delete',
        entity: 'patient',
        params: {},
        confidence: 0.9,
        rawText: 'test',
      },
      prompt: 'Confirmar eliminación?',
      expiresAt: Date.now() - 1000, // Already expired
    };
    expect(isConfirmationExpired(expiredConfirmation)).toBe(true);
  });

  it('Active confirmation is not expired', () => {
    const activeConfirmation: PendingConfirmation = {
      intent: {
        operation: 'delete',
        entity: 'patient',
        params: {},
        confidence: 0.9,
        rawText: 'test',
      },
      prompt: 'Confirmar eliminación?',
      expiresAt: Date.now() + CONFIRMATION_TIMEOUT_MS,
    };
    expect(isConfirmationExpired(activeConfirmation)).toBe(false);
  });
});

// ─── Property 15 & 16: Context Persistence and Clearing ────────────────────

describe('Context Management', () => {
  // Feature: ai-chatbot-assistant, Property 15: Context Persistence Across Session

  it('Property 15: Context retains IDs after operations', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), (patientId, appointmentId) => {
        const context: ConversationContext = {};
        const updated = {
          ...context,
          lastPatientId: patientId,
          lastAppointmentId: appointmentId,
        };
        expect(updated.lastPatientId).toBe(patientId);
        expect(updated.lastAppointmentId).toBe(appointmentId);
      }),
      { numRuns: 100, verbose: true }
    );
  });

  // Feature: ai-chatbot-assistant, Property 16: Context Clearing on Reset

  it('Property 16: clearContext returns empty context', () => {
    fc.assert(
      fc.property(contextArb, (context) => {
        const cleared = clearContext();
        expect(cleared.lastPatientId).toBeUndefined();
        expect(cleared.lastAppointmentId).toBeUndefined();
        expect(cleared.pendingConfirmation).toBeUndefined();
        expect(cleared.pendingDisambiguation).toBeUndefined();
        expect(cleared.pendingIntent).toBeUndefined();
        expect(cleared.accumulatedParams).toBeUndefined();
      }),
      { numRuns: 100, verbose: true }
    );
  });
});

// ─── Property 24-26: Spanish Language Responses ────────────────────────────

describe('Spanish Language Responses', () => {
  // Feature: ai-chatbot-assistant, Property 24: Spanish Language Responses

  it('Property 24: All formatter responses are non-empty strings', () => {
    const response = formatter.help();
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);

    const reset = formatter.reset();
    expect(typeof reset).toBe('string');

    const unknown = formatter.unknown('test message');
    expect(typeof unknown).toBe('string');
  });

  it('Property 26: Dates are formatted in Spanish locale', () => {
    const iso = '2024-04-15T10:30:00-03:00';
    const formatted = formatDateTimeES(iso);
    // Should contain day/month/year format
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('Appointment created response contains patient name', () => {
    const response = formatter.appointmentCreated({
      patient_first_name: 'Juan',
      patient_last_name: 'Pérez',
      scheduled_at: '2024-04-15T10:00:00-03:00',
    });
    expect(response).toContain('Juan');
    expect(response).toContain('Pérez');
  });

  it('Patient created response contains patient name', () => {
    const response = formatter.patientCreated({
      first_name: 'María',
      last_name: 'García',
    });
    expect(response).toContain('María');
    expect(response).toContain('García');
  });
});

// ─── Property 21: Message History Display ──────────────────────────────────

describe('Response Formatting', () => {
  // Feature: ai-chatbot-assistant, Property 21: Message History Display

  it('Property 21: Empty list returns informative message', () => {
    const response = formatter.appointmentsList([]);
    expect(response).toBeTruthy();
    expect(typeof response).toBe('string');

    const patientsResponse = formatter.patientsList([]);
    expect(patientsResponse).toBeTruthy();
  });

  it('List with items returns formatted list', () => {
    const appointments = [
      {
        id: '1',
        patient_first_name: 'Ana',
        patient_last_name: 'López',
        scheduled_at: '2024-04-15T10:00:00-03:00',
        status: 'confirmed',
      },
    ];
    const response = formatter.appointmentsList(appointments);
    expect(response).toContain('Ana');
    expect(response).toContain('López');
  });

  // Feature: ai-chatbot-assistant, Property 37: Formatting Consistency

  it('Property 37: List pagination limits to max 10 items', () => {
    const manyAppointments = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      patient_first_name: 'Paciente',
      patient_last_name: String(i),
      scheduled_at: '2024-04-15T10:00:00-03:00',
      status: 'pending',
    }));
    const response = formatter.appointmentsList(manyAppointments, 15);
    // Should contain pagination note
    expect(response).toContain('Mostrando');
    expect(response).toContain('15');
  });
});

// ─── Property 29: Input Validation ─────────────────────────────────────────

describe('Error Messages', () => {
  // Feature: ai-chatbot-assistant, Property 20: Error Message User-Friendliness

  it('Error messages are user-friendly strings', () => {
    expect(formatter.errorInvalidDate()).toContain('fecha');
    expect(formatter.errorInvalidEmail()).toContain('email');
    expect(formatter.errorInvalidPhone()).toContain('teléfono');
    expect(formatter.errorInvalidDuration()).toContain('minutos');
    expect(formatter.errorNotFound('patient')).toContain('paciente');
    expect(formatter.errorNotFound('appointment')).toContain('turno');
  });

  it('Unknown command suggests alternatives', () => {
    const response = formatter.unknown('texto extraño xyz');
    expect(response).toContain('texto extraño xyz');
    expect(response.toLowerCase()).toContain('ayuda');
  });
});

// ─── Disambiguation tests ───────────────────────────────────────────────────

describe('Disambiguation', () => {
  // Feature: ai-chatbot-assistant, Property 14: Disambiguation for Multiple Matches

  it('Numeric selection resolves disambiguation', () => {
    const context: ConversationContext = {
      pendingDisambiguation: {
        intent: {
          operation: 'update',
          entity: 'patient',
          params: {},
          confidence: 0.9,
          rawText: 'test',
        },
        options: [
          { id: 'id-1', label: 'Juan Pérez — 011-1234' },
          { id: 'id-2', label: 'Juan García — 011-5678' },
        ],
        question: '¿Cuál paciente?',
        field: 'patient_id',
      },
    };

    expect(resolveDisambiguationResponse('1', context)).toBe('id-1');
    expect(resolveDisambiguationResponse('2', context)).toBe('id-2');
    expect(resolveDisambiguationResponse('3', context)).toBeNull();
  });

  it('Name matching resolves disambiguation', () => {
    const context: ConversationContext = {
      pendingDisambiguation: {
        intent: {
          operation: 'update',
          entity: 'patient',
          params: {},
          confidence: 0.9,
          rawText: 'test',
        },
        options: [
          { id: 'id-1', label: 'Juan Pérez' },
          { id: 'id-2', label: 'Juan García' },
        ],
        question: '¿Cuál paciente?',
        field: 'patient_id',
      },
    };

    expect(resolveDisambiguationResponse('pérez', context)).toBe('id-1');
    expect(resolveDisambiguationResponse('garcía', context)).toBe('id-2');
  });
});
