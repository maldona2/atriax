/**
 * Unit + property tests for WhatsAppService
 *
 * Feature: whatsapp-bot
 * Validates: Requirements 2.1, 2.5, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 12.1, 12.2, 13.4, 13.5
 */

import * as fc from 'fast-check';
import { WhatsAppService } from '../services/WhatsAppService.js';
import type { IncomingWhatsAppMessage, MetaWebhookPayload } from '../types.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetContext = jest.fn().mockResolvedValue({});
const mockSaveContext = jest.fn().mockResolvedValue(undefined);
const MockSessionManager = jest.fn().mockImplementation(() => ({
  getContext: mockGetContext,
  saveContext: mockSaveContext,
}));

const mockSendTextMessage = jest
  .fn()
  .mockResolvedValue({ success: true, messageId: 'wamid.test' });
const MockMetaAPIClient = jest.fn().mockImplementation(() => ({
  sendTextMessage: mockSendTextMessage,
}));

const mockRecognize = jest.fn();
jest.mock('../../chatbot/services/IntentRecognizer.js', () => ({
  IntentRecognizer: jest
    .fn()
    .mockImplementation(() => ({ recognize: mockRecognize })),
}));

const mockExecute = jest.fn();
jest.mock('../../chatbot/services/CommandExecutor.js', () => ({
  CommandExecutor: jest
    .fn()
    .mockImplementation(() => ({ execute: mockExecute })),
}));

jest.mock('../../chatbot/services/ResponseFormatter.js', () => ({
  ResponseFormatter: jest.fn().mockImplementation(() => ({
    unknown: () => 'No entiendo tu mensaje.',
    help: () => 'Ayuda disponible.',
    reset: () => 'Conversación reiniciada.',
    confirmationTimeout: () => 'Confirmación expirada.',
    confirmationDeclined: () => 'Operación cancelada.',
    appointmentCreated: () => '✅ Turno creado.',
    appointmentsList: () => '📋 Lista de turnos.',
    appointmentDetail: () => '📋 Detalle.',
    appointmentUpdated: () => '✅ Turno actualizado.',
    appointmentCancelled: () => '✅ Turno cancelado.',
    patientCreated: () => '✅ Paciente creado.',
    patientsList: () => '📋 Pacientes.',
    patientDetail: () => '📋 Paciente.',
    patientUpdated: () => '✅ Paciente actualizado.',
    patientDeleted: () => '✅ Paciente eliminado.',
    errorNotFound: () => 'No encontrado.',
    errorInvalidDate: () => 'Fecha inválida.',
    errorInvalidEmail: () => 'Email inválido.',
    errorInvalidPhone: () => 'Teléfono inválido.',
    errorInvalidDuration: () => 'Duración inválida.',
    errorGeneral: () => 'Error general.',
  })),
  formatDateTimeES: jest.fn((d: string) => d),
}));

jest.mock('../../chatbot/services/ConversationManager.js', () => ({
  resolveReferences: jest.fn((intent: unknown) => intent),
  mergeAccumulatedParams: jest.fn((intent: unknown) => intent),
  updateContextAfterOperation: jest.fn((_ctx: unknown, _data: unknown) => ({})),
  setPendingIntent: jest.fn((_ctx: unknown) => ({})),
  clearContext: jest.fn(() => ({})),
  resolveDisambiguationResponse: jest.fn(() => null),
  isAffirmativeResponse: jest.fn(() => false),
  isNegativeResponse: jest.fn(() => false),
}));

jest.mock('../../chatbot/services/AmbiguityResolver.js', () => ({
  findMissingParam: jest.fn(() => null),
  createPatientDisambiguation: jest.fn(),
  createAppointmentDisambiguation: jest.fn(),
  formatDisambiguationResponse: jest.fn(() => 'disambiguation'),
}));

jest.mock('../../chatbot/services/ConfirmationHandler.js', () => ({
  requiresConfirmation: jest.fn(() => false),
  createConfirmation: jest.fn(),
  isConfirmationExpired: jest.fn(() => false),
  setPendingConfirmation: jest.fn((_ctx: unknown) => ({})),
  clearPendingConfirmation: jest.fn((_ctx: unknown) => ({})),
}));

jest.mock('../../services/patientService.js', () => ({}));
jest.mock('../../services/appointmentService.js', () => ({}));

const mockDbInsert = jest.fn().mockResolvedValue([]);
jest.mock('../../db/client.js', () => ({
  db: { insert: () => ({ values: mockDbInsert }) },
  whatsappMessages: {},
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeService(): WhatsAppService {
  return new WhatsAppService(
    new MockSessionManager() as unknown as import('../services/SessionManager.js').SessionManager,
    new MockMetaAPIClient() as unknown as import('../services/MetaAPIClient.js').MetaAPIClient
  );
}

let _msgCounter = 0;
function makeIncoming(
  overrides: Partial<IncomingWhatsAppMessage> = {}
): IncomingWhatsAppMessage {
  return {
    tenantId: 'tenant-001',
    phoneNumber: '+5491112345678',
    text: 'Quiero ver mis turnos',
    metaMessageId: `wamid.unique-${++_msgCounter}`,
    ...overrides,
  };
}

function makeIntent(overrides = {}) {
  return {
    operation: 'list',
    entity: 'appointment',
    params: {},
    confidence: 0.9,
    rawText: 'Quiero ver mis turnos',
    ...overrides,
  };
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('WhatsAppService - processIncomingMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('processes a message end-to-end: loads context, runs intent, sends reply', async () => {
    mockRecognize.mockResolvedValueOnce(makeIntent());
    mockExecute.mockResolvedValueOnce({ success: true, data: [] });

    const service = makeService();
    await service.processIncomingMessage(makeIncoming(), 'user-001');

    expect(mockGetContext).toHaveBeenCalledWith('tenant-001', '+5491112345678');
    expect(mockRecognize).toHaveBeenCalledWith('Quiero ver mis turnos');
    expect(mockSendTextMessage).toHaveBeenCalled();
    expect(mockSaveContext).toHaveBeenCalledWith(
      'tenant-001',
      '+5491112345678',
      expect.any(Object)
    );
  });

  it('sends a fallback error message when processing throws', async () => {
    mockRecognize.mockRejectedValueOnce(new Error('OpenAI down'));

    const service = makeService();
    await service.processIncomingMessage(makeIncoming(), 'user-001');

    expect(mockSendTextMessage).toHaveBeenCalledWith(
      '+5491112345678',
      expect.stringContaining('error')
    );
  });

  it('logs inbound and outbound messages', async () => {
    mockRecognize.mockResolvedValueOnce(
      makeIntent({ operation: 'unknown', confidence: 0 })
    );

    const service = makeService();
    await service.processIncomingMessage(makeIncoming(), 'user-001');

    // Once for inbound, once for outbound via sendMessage
    expect(mockDbInsert).toHaveBeenCalledTimes(2);
  });
});

describe('WhatsAppService - deduplication', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ignores a message with a duplicate Meta message ID within 5 minutes', async () => {
    mockRecognize.mockResolvedValue(makeIntent());
    mockExecute.mockResolvedValue({ success: true, data: [] });

    const service = makeService();
    const msg = makeIncoming({ metaMessageId: 'wamid.dup-test' });

    await service.processIncomingMessage(msg, 'user-001');
    jest.clearAllMocks();
    await service.processIncomingMessage(msg, 'user-001'); // duplicate

    expect(mockRecognize).not.toHaveBeenCalled();
    expect(mockSendTextMessage).not.toHaveBeenCalled();
  });

  it('processes a message with a different Meta message ID', async () => {
    mockRecognize.mockResolvedValue(makeIntent());
    mockExecute.mockResolvedValue({ success: true, data: [] });

    const service = makeService();
    await service.processIncomingMessage(
      makeIncoming({ metaMessageId: 'wamid.a' }),
      'user-001'
    );
    jest.clearAllMocks();
    mockRecognize.mockResolvedValue(makeIntent());
    mockExecute.mockResolvedValue({ success: true, data: [] });
    await service.processIncomingMessage(
      makeIncoming({ metaMessageId: 'wamid.b' }),
      'user-001'
    );

    expect(mockRecognize).toHaveBeenCalledTimes(1);
  });
});

describe('WhatsAppService - low confidence handling', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends unknown response for intents below confidence threshold', async () => {
    mockRecognize.mockResolvedValueOnce(
      makeIntent({ operation: 'unknown', confidence: 0.1 })
    );

    const service = makeService();
    await service.processIncomingMessage(makeIncoming(), 'user-001');

    expect(mockExecute).not.toHaveBeenCalled();
    expect(mockSendTextMessage).toHaveBeenCalledWith(
      '+5491112345678',
      expect.stringContaining('entiendo')
    );
  });
});

describe('WhatsAppService - handleWebhookPayload', () => {
  beforeEach(() => jest.clearAllMocks());

  it('skips non-text message types', async () => {
    const payload: MetaWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry-1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '+1',
                  phone_number_id: 'phone-id',
                },
                messages: [
                  {
                    from: '5491112345678',
                    id: 'wamid.1',
                    timestamp: '1',
                    type: 'image',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const service = makeService();
    await service.handleWebhookPayload(payload, 'tenant-001', 'user-001');
    expect(mockRecognize).not.toHaveBeenCalled();
  });

  it('processes text messages from the payload', async () => {
    mockRecognize.mockResolvedValueOnce(makeIntent());
    mockExecute.mockResolvedValueOnce({ success: true, data: [] });

    const payload: MetaWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry-1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '+1',
                  phone_number_id: 'phone-id',
                },
                messages: [
                  {
                    from: '5491112345678',
                    id: 'wamid.payload-test',
                    timestamp: '1',
                    type: 'text',
                    text: { body: 'Hola' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const service = makeService();
    await service.handleWebhookPayload(payload, 'tenant-001', 'user-001');
    expect(mockRecognize).toHaveBeenCalledWith('Hola');
  });
});

// ─── Property tests ───────────────────────────────────────────────────────────

/**
 * Property 5: Message Deduplication
 * For any unique Meta message ID, processing it twice must only invoke intent
 * recognition once (the second call is deduplicated).
 * Validates: Requirements 2.5
 */
describe('Property 5: Message Deduplication', () => {
  it('deduplicates any message ID within the 5-minute window', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }),
        async (messageId) => {
          jest.clearAllMocks();
          mockRecognize.mockResolvedValue(makeIntent());
          mockExecute.mockResolvedValue({ success: true, data: [] });

          const service = makeService();
          const msg = makeIncoming({ metaMessageId: messageId });

          await service.processIncomingMessage(msg, 'user-001');
          const firstCallCount = mockRecognize.mock.calls.length;
          jest.clearAllMocks();
          mockRecognize.mockResolvedValue(makeIntent());

          await service.processIncomingMessage(msg, 'user-001');
          const secondCallCount = mockRecognize.mock.calls.length;

          // First call should have processed; second should be skipped
          return firstCallCount === 1 && secondCallCount === 0;
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 40: Exception Handling with User Feedback
 * When intent recognition throws for any message, the user must receive a
 * non-empty error message (never silence or undefined).
 * Validates: Requirements 13.4, 13.5
 */
describe('Property 40: Exception Handling with User Feedback', () => {
  it('always sends a non-empty fallback reply when processing fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        async (text) => {
          jest.clearAllMocks();
          mockRecognize.mockRejectedValueOnce(new Error('Unexpected error'));
          mockSendTextMessage.mockResolvedValueOnce({ success: true });

          const service = makeService();
          const msg = makeIncoming({
            text,
            metaMessageId: `wamid.${Math.random()}`,
          });
          await service.processIncomingMessage(msg, 'user-001');

          const calls = mockSendTextMessage.mock.calls;
          return (
            calls.length === 1 &&
            typeof calls[0][1] === 'string' &&
            calls[0][1].length > 0
          );
        }
      ),
      { numRuns: 20 }
    );
  });
});
