/**
 * WhatsAppService - Main orchestration layer for the WhatsApp bot.
 *
 * Mirrors the flow of ChatbotService but replaces frontend sessionStorage with
 * database-backed SessionManager and sends replies via MetaAPIClient.
 *
 * Flow:
 *   1. Extract message from Meta webhook payload
 *   2. Deduplicate (5-minute in-memory window keyed by Meta message ID)
 *   3. Load conversation context from SessionManager
 *   4. Delegate to ChatbotService-equivalent logic:
 *        IntentRecognizer → CommandExecutor → ResponseFormatter
 *   5. Persist updated context via SessionManager
 *   6. Send reply via MetaAPIClient
 *   7. Log to whatsappMessages table
 */

import type { MetaWebhookPayload, IncomingWhatsAppMessage } from '../types.js';
import { SessionManager } from './SessionManager.js';
import { MetaAPIClient } from './MetaAPIClient.js';
import { IntentRecognizer } from '../../chatbot/services/IntentRecognizer.js';
import { CommandExecutor } from '../../chatbot/services/CommandExecutor.js';
import { ResponseFormatter } from '../../chatbot/services/ResponseFormatter.js';
import {
  resolveReferences,
  mergeAccumulatedParams,
  updateContextAfterOperation,
  setPendingIntent,
  clearContext,
  resolveDisambiguationResponse,
  isAffirmativeResponse,
  isNegativeResponse,
} from '../../chatbot/services/ConversationManager.js';
import {
  findMissingParam,
  createPatientDisambiguation,
  createAppointmentDisambiguation,
  formatDisambiguationResponse,
} from '../../chatbot/services/AmbiguityResolver.js';
import {
  requiresConfirmation,
  createConfirmation,
  isConfirmationExpired,
  setPendingConfirmation,
  clearPendingConfirmation,
} from '../../chatbot/services/ConfirmationHandler.js';
import * as patientService from '../../services/patientService.js';
import * as appointmentService from '../../services/appointmentService.js';
import { formatDateTimeES } from '../../chatbot/services/ResponseFormatter.js';
import { db, whatsappMessages } from '../../db/client.js';
import type { ConversationContext, Intent } from '../../chatbot/types.js';
import logger from '../../utils/logger.js';

// In-memory deduplication: Meta message ID → expiry timestamp (ms)
const seen = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1_000;

export class WhatsAppService {
  private readonly sessionManager: SessionManager;
  private readonly metaClient: MetaAPIClient;
  private readonly intentRecognizer: IntentRecognizer;
  private readonly commandExecutor: CommandExecutor;
  private readonly formatter: ResponseFormatter;

  constructor(
    sessionManager = new SessionManager(),
    metaClient = new MetaAPIClient()
  ) {
    this.sessionManager = sessionManager;
    this.metaClient = metaClient;
    this.intentRecognizer = new IntentRecognizer();
    this.commandExecutor = new CommandExecutor();
    this.formatter = new ResponseFormatter();
  }

  /**
   * Processes a Meta webhook payload, handling all messages within it.
   * One payload can carry multiple entries and messages.
   *
   * @param payload - Parsed Meta webhook JSON
   * @param tenantId - The tenant that owns the WhatsApp Business number that received the message
   * @param userId   - The professional's user ID associated with that WhatsApp number
   */
  async handleWebhookPayload(
    payload: MetaWebhookPayload,
    tenantId: string,
    userId: string
  ): Promise<void> {
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;
        const messages = change.value.messages ?? [];
        for (const msg of messages) {
          if (msg.type !== 'text' || !msg.text?.body) continue;

          const incoming: IncomingWhatsAppMessage = {
            tenantId,
            phoneNumber: `+${msg.from}`,
            text: msg.text.body,
            metaMessageId: msg.id,
          };

          await this.processIncomingMessage(incoming, userId);
        }
      }
    }
  }

  /**
   * Processes a single inbound WhatsApp message end-to-end.
   */
  async processIncomingMessage(
    msg: IncomingWhatsAppMessage,
    userId: string
  ): Promise<void> {
    // ── Deduplication ─────────────────────────────────────────────────────────
    if (this._isDuplicate(msg.metaMessageId)) {
      logger.info(
        { metaMessageId: msg.metaMessageId },
        'WhatsApp: duplicate message ignored'
      );
      return;
    }
    this._markSeen(msg.metaMessageId);

    logger.info(
      {
        tenantId: msg.tenantId,
        phoneNumber: msg.phoneNumber,
        text: msg.text.substring(0, 80),
      },
      'WhatsApp: processing inbound message'
    );

    // ── Log inbound ───────────────────────────────────────────────────────────
    await this._logMessage(
      msg.tenantId,
      msg.phoneNumber,
      'inbound',
      'user',
      msg.text,
      msg.metaMessageId
    );

    // ── Load context ──────────────────────────────────────────────────────────
    let context = await this.sessionManager.getContext(
      msg.tenantId,
      msg.phoneNumber
    );

    // ── Build chatbot-style request and process it ────────────────────────────
    let responseText: string;
    try {
      const result = await this._processMessage(
        msg.text,
        context,
        msg.tenantId,
        userId
      );
      responseText = result.response;
      context = result.context;
    } catch (err) {
      logger.error(
        { err, tenantId: msg.tenantId },
        'WhatsApp: error processing message'
      );
      responseText =
        'Ocurrió un error al procesar tu mensaje. Por favor, intenta nuevamente.';
    }

    // ── Persist updated context ───────────────────────────────────────────────
    await this.sessionManager.saveContext(
      msg.tenantId,
      msg.phoneNumber,
      context
    );

    // ── Send reply ────────────────────────────────────────────────────────────
    await this.sendMessage(msg.tenantId, msg.phoneNumber, responseText);
  }

  /**
   * Sends an outbound message and logs it.
   */
  async sendMessage(
    tenantId: string,
    phoneNumber: string,
    text: string
  ): Promise<void> {
    const result = await this.metaClient.sendTextMessage(phoneNumber, text);
    await this._logMessage(
      tenantId,
      phoneNumber,
      'outbound',
      'assistant',
      text,
      result.messageId
    );
    if (!result.success) {
      logger.error(
        { tenantId, phoneNumber, error: result.error },
        'WhatsApp: failed to send reply'
      );
    }
  }

  // ─── Core message processing (mirrors ChatbotService logic) ─────────────────

  private async _processMessage(
    message: string,
    context: ConversationContext,
    tenantId: string,
    userId: string
  ): Promise<{ response: string; context: ConversationContext }> {
    let updatedContext = { ...context };

    // Step 1: pending confirmation
    if (updatedContext.pendingConfirmation) {
      const { pendingConfirmation } = updatedContext;
      if (isConfirmationExpired(pendingConfirmation)) {
        updatedContext = clearPendingConfirmation(updatedContext);
        return {
          response: this.formatter.confirmationTimeout(),
          context: updatedContext,
        };
      }
      if (isAffirmativeResponse(message)) {
        updatedContext = clearPendingConfirmation(updatedContext);
        return this._executeIntent(
          pendingConfirmation.intent,
          updatedContext,
          tenantId,
          userId,
          true
        );
      }
      if (isNegativeResponse(message)) {
        updatedContext = clearPendingConfirmation(updatedContext);
        return {
          response: this.formatter.confirmationDeclined(),
          context: updatedContext,
        };
      }
      return { response: pendingConfirmation.prompt, context: updatedContext };
    }

    // Step 2: pending disambiguation
    if (updatedContext.pendingDisambiguation) {
      const selectedId = resolveDisambiguationResponse(message, updatedContext);
      const { pendingDisambiguation } = updatedContext;
      if (selectedId) {
        const resolvedIntent = {
          ...pendingDisambiguation.intent,
          params: {
            ...pendingDisambiguation.intent.params,
            [pendingDisambiguation.field]: selectedId,
          },
        };
        updatedContext = { ...updatedContext };
        delete updatedContext.pendingDisambiguation;
        return this._executeIntent(
          resolvedIntent,
          updatedContext,
          tenantId,
          userId
        );
      }
      return {
        response: formatDisambiguationResponse(pendingDisambiguation),
        context: updatedContext,
      };
    }

    // Step 3: multi-turn parameter collection
    if (updatedContext.pendingIntent && updatedContext.accumulatedParams) {
      const previousIntent = updatedContext.pendingIntent;
      const pendingField = updatedContext.pendingField;
      const injectedParams: Record<string, unknown> = pendingField
        ? this._injectFieldValue(pendingField, message)
        : {};
      const partialIntent = await this.intentRecognizer.recognize(message);
      const mergedIntent = mergeAccumulatedParams(
        {
          ...previousIntent,
          params: { ...injectedParams, ...partialIntent.params },
        },
        updatedContext
      );
      updatedContext = { ...updatedContext };
      delete updatedContext.pendingIntent;
      delete updatedContext.accumulatedParams;
      delete updatedContext.pendingField;
      return this._executeIntent(
        mergedIntent,
        updatedContext,
        tenantId,
        userId
      );
    }

    // Step 4: recognize intent
    const intent = await this.intentRecognizer.recognize(message);
    logger.info(
      {
        operation: intent.operation,
        entity: intent.entity,
        confidence: intent.confidence,
      },
      'WhatsApp: intent recognized'
    );

    if (intent.operation === 'reset') {
      return { response: this.formatter.reset(), context: clearContext() };
    }
    if (intent.operation === 'help') {
      return { response: this.formatter.help(), context: updatedContext };
    }
    if (intent.operation === 'unknown' || intent.confidence < 0.4) {
      return {
        response: this.formatter.unknown(message),
        context: updatedContext,
      };
    }

    const resolvedIntent = resolveReferences(intent, updatedContext);
    return this._executeIntent(
      resolvedIntent,
      updatedContext,
      tenantId,
      userId
    );
  }

  private async _executeIntent(
    intent: Intent,
    context: ConversationContext,
    tenantId: string,
    userId: string,
    alreadyConfirmed = false
  ): Promise<{ response: string; context: ConversationContext }> {
    let updatedContext = { ...context };

    const missingParam = findMissingParam(intent, updatedContext);
    if (missingParam) {
      updatedContext = setPendingIntent(updatedContext, intent, intent.params);
      updatedContext.pendingField = missingParam.field;
      return { response: missingParam.prompt, context: updatedContext };
    }

    if (!alreadyConfirmed && requiresConfirmation(intent)) {
      const entityDetails = await this._fetchEntityDetails(
        intent,
        updatedContext,
        tenantId
      );
      const confirmation = createConfirmation(intent, entityDetails);
      updatedContext = setPendingConfirmation(updatedContext, confirmation);
      return { response: confirmation.prompt, context: updatedContext };
    }

    const result = await this.commandExecutor.execute(
      intent,
      updatedContext,
      tenantId,
      userId
    );

    if (!result.success) {
      const errorResponse = this._handleExecutionError(
        result.error ?? '',
        result,
        intent,
        updatedContext
      );
      return errorResponse;
    }

    updatedContext = updateContextAfterOperation(updatedContext, {
      patientId: result.patientId,
      appointmentId: result.appointmentId,
    });

    const response = this._formatSuccessResponse(intent, result.data);
    return { response, context: updatedContext };
  }

  private _handleExecutionError(
    error: string,
    result: { data?: unknown; statusCode?: number },
    intent: Intent,
    context: ConversationContext
  ): { response: string; context: ConversationContext } {
    if (error === 'AMBIGUOUS_PATIENT') {
      const patients = Array.isArray(result.data) ? result.data : [];
      if (patients.length > 0) {
        const disambiguation = createPatientDisambiguation(
          intent,
          patients as Array<{
            id: string;
            first_name: string;
            last_name: string;
            phone?: string | null;
          }>,
          context
        );
        return {
          response: formatDisambiguationResponse(disambiguation),
          context: { ...context, pendingDisambiguation: disambiguation },
        };
      }
    }
    if (error === 'AMBIGUOUS_APPOINTMENT') {
      const apts = Array.isArray(result.data) ? result.data : [];
      if (apts.length > 0) {
        const disambiguation = createAppointmentDisambiguation(
          intent,
          apts as Array<{
            id: string;
            patient_first_name?: string;
            patient_last_name?: string;
            scheduled_at: Date | string | null;
            status: string;
          }>,
          context
        );
        return {
          response: formatDisambiguationResponse(disambiguation),
          context: { ...context, pendingDisambiguation: disambiguation },
        };
      }
    }
    if (error === 'PATIENT_NOT_FOUND') {
      if (
        intent.entity === 'appointment' &&
        (intent.operation === 'create' || intent.operation === 'update')
      ) {
        const {
          patient_name: _pn,
          patient_id: _pi,
          full_name: _fn,
          ...dateTimeParams
        } = intent.params as Record<string, unknown>;
        const retryIntent = { ...intent, params: dateTimeParams };
        const retryContext = setPendingIntent(
          context,
          retryIntent,
          dateTimeParams
        );
        return {
          response:
            'No se encontró ningún paciente con ese nombre. ¿Podría indicar el nombre nuevamente?',
          context: { ...retryContext, pendingField: 'patient_name_or_id' },
        };
      }
      return { response: this.formatter.errorNotFound('patient'), context };
    }
    if (error === 'INVALID_DATE')
      return { response: this.formatter.errorInvalidDate(), context };
    if (error === 'INVALID_EMAIL')
      return { response: this.formatter.errorInvalidEmail(), context };
    if (error === 'INVALID_PHONE')
      return { response: this.formatter.errorInvalidPhone(), context };
    if (error === 'INVALID_DURATION')
      return { response: this.formatter.errorInvalidDuration(), context };
    if (error === 'NOT_FOUND' || result.statusCode === 404)
      return { response: this.formatter.errorNotFound(intent.entity), context };
    return { response: this.formatter.errorGeneral(error), context };
  }

  private _formatSuccessResponse(intent: Intent, data: unknown): string {
    const { operation, entity } = intent;
    switch (entity) {
      case 'appointment': {
        const apt = data as Record<string, unknown>;
        if (operation === 'create')
          return this.formatter.appointmentCreated(apt);
        if (operation === 'list' || operation === 'search')
          return this.formatter.appointmentsList(
            Array.isArray(data) ? (data as Record<string, unknown>[]) : []
          );
        if (operation === 'read') return this.formatter.appointmentDetail(apt);
        if (operation === 'update') {
          return intent.params.status === 'cancelled'
            ? this.formatter.appointmentCancelled(apt)
            : this.formatter.appointmentUpdated(apt);
        }
        if (operation === 'delete') {
          if (Array.isArray(data))
            return `✅ Se cancelaron ${data.length} turno${data.length !== 1 ? 's' : ''} correctamente.`;
          return this.formatter.appointmentCancelled(apt);
        }
        break;
      }
      case 'patient': {
        const patient = data as Record<string, unknown>;
        if (operation === 'create')
          return this.formatter.patientCreated(patient);
        if (operation === 'list' || operation === 'search')
          return this.formatter.patientsList(
            Array.isArray(data) ? (data as Record<string, unknown>[]) : []
          );
        if (operation === 'read')
          return this.formatter.patientDetail(
            (patient.patient ?? patient) as Record<string, unknown>
          );
        if (operation === 'update')
          return this.formatter.patientUpdated(patient);
        if (operation === 'delete')
          return this.formatter.patientDeleted(patient);
        break;
      }
      case 'session': {
        const sessions = Array.isArray(data) ? data : [];
        if (sessions.length === 0)
          return 'No se encontraron sesiones previas para este paciente.';
        const items = sessions
          .slice(0, 10)
          .map((s: Record<string, unknown>) => {
            const date = s.scheduled_at
              ? formatDateTimeES(String(s.scheduled_at))
              : 'Fecha no disponible';
            const procedures = s.procedures_performed
              ? String(s.procedures_performed)
              : 'Sin procedimientos registrados';
            return `• *${date}:* ${procedures}`;
          })
          .join('\n');
        return `📋 *Historial de sesiones:*\n\n${items}`;
      }
    }
    return '✅ Operación realizada correctamente.';
  }

  private async _fetchEntityDetails(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<{ patientName?: string; dateTime?: string }> {
    try {
      if (intent.entity === 'patient') {
        const patientId =
          (intent.params.patient_id as string | undefined) ??
          context.lastPatientId;
        if (patientId) {
          const result = await patientService.getById(tenantId, patientId);
          if (result)
            return {
              patientName: `${result.patient.first_name} ${result.patient.last_name}`,
            };
        }
      }
      if (intent.entity === 'appointment') {
        const appointmentId =
          (intent.params.appointment_id as string | undefined) ??
          context.lastAppointmentId;
        if (appointmentId) {
          const result = await appointmentService.getById(
            tenantId,
            appointmentId
          );
          if (result) {
            return {
              patientName:
                result.patient_first_name && result.patient_last_name
                  ? `${result.patient_first_name} ${result.patient_last_name}`
                  : undefined,
              dateTime: result.scheduled_at
                ? formatDateTimeES(String(result.scheduled_at))
                : undefined,
            };
          }
        }
      }
    } catch {
      /* non-critical */
    }
    return {};
  }

  private _injectFieldValue(
    field: string,
    message: string
  ): Record<string, unknown> {
    const value = message.trim();
    switch (field) {
      case 'patient_name_or_id':
        return { patient_name: value };
      case 'appointment_id_or_ref':
        return { patient_name: value };
      case 'date':
        return { date: value };
      case 'time':
        return { time: value };
      case 'search_query':
        return { search_query: value };
      case 'first_name': {
        const parts = value.split(/\s+/);
        return { first_name: parts[0] };
      }
      case 'last_name': {
        const parts = value.split(/\s+/);
        return { last_name: parts.slice(1).join(' ') || value };
      }
      default:
        return { [field]: value };
    }
  }

  private _isDuplicate(messageId: string): boolean {
    const expiry = seen.get(messageId);
    if (expiry === undefined) return false;
    if (Date.now() > expiry) {
      seen.delete(messageId);
      return false;
    }
    return true;
  }

  private _markSeen(messageId: string): void {
    seen.set(messageId, Date.now() + DEDUP_WINDOW_MS);
    // Prune stale entries to prevent unbounded growth
    if (seen.size > 10_000) {
      const now = Date.now();
      for (const [id, expiry] of seen) {
        if (now > expiry) seen.delete(id);
      }
    }
  }

  private async _logMessage(
    tenantId: string,
    phoneNumber: string,
    direction: 'inbound' | 'outbound',
    role: 'user' | 'assistant',
    content: string,
    metaMessageId?: string
  ): Promise<void> {
    try {
      await db.insert(whatsappMessages).values({
        tenantId,
        phoneNumber,
        direction,
        role,
        content,
        metaMessageId: metaMessageId ?? null,
      });
    } catch (err) {
      logger.error({ err }, 'WhatsApp: failed to log message');
    }
  }
}
