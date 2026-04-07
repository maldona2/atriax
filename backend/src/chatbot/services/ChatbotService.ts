/**
 * ChatbotService - Main orchestration layer for the AI chatbot.
 * Flow: confirmation check → disambiguation check → intent recognition → execution
 */

import type {
  ChatbotRequest,
  ChatbotResponse,
  ConversationContext,
  Intent,
} from '../types.js';
import { IntentRecognizer } from './IntentRecognizer.js';
import { CommandExecutor } from './CommandExecutor.js';
import { ResponseFormatter } from './ResponseFormatter.js';
import {
  resolveReferences,
  mergeAccumulatedParams,
  updateContextAfterOperation,
  setPendingIntent,
  clearContext,
  resolveDisambiguationResponse,
  isAffirmativeResponse,
  isNegativeResponse,
} from './ConversationManager.js';
import {
  findMissingParam,
  createPatientDisambiguation,
  createAppointmentDisambiguation,
  formatDisambiguationResponse,
} from './AmbiguityResolver.js';
import {
  requiresConfirmation,
  createConfirmation,
  isConfirmationExpired,
  setPendingConfirmation,
  clearPendingConfirmation,
} from './ConfirmationHandler.js';
import * as patientService from '../../services/patientService.js';
import * as appointmentService from '../../services/appointmentService.js';
import { formatDateTimeES } from './ResponseFormatter.js';
import logger from '../../utils/logger.js';

const intentRecognizer = new IntentRecognizer();
const commandExecutor = new CommandExecutor();
const formatter = new ResponseFormatter();

/**
 * Maps a pending field name to the correct param key(s) using the raw message text.
 * Used when the user answers a multi-turn prompt with a bare value (e.g. "matias maldonado").
 */
function injectFieldValue(
  field: string,
  message: string
): Record<string, unknown> {
  const value = message.trim();
  switch (field) {
    case 'patient_name_or_id':
      return { patient_name: value };
    case 'appointment_id_or_ref':
      return { patient_name: value }; // treat as patient name to trigger search
    case 'date':
      return { date: value };
    case 'time':
      return { time: value };
    case 'search_query':
      return { search_query: value };
    case 'treatment_name_or_id':
    case 'treatment_name':
      return { treatment_name: value };
    case 'price_cents': {
      const numVal = parseFloat(
        value.replace(/[^0-9.,]/g, '').replace(',', '.')
      );
      if (!isNaN(numVal)) {
        // If the value looks like it's already in cents (very large number), use as-is
        // Otherwise treat as pesos and convert
        return {
          price_cents: numVal >= 100 ? numVal : Math.round(numVal * 100),
        };
      }
      return { price_cents: value };
    }
    case 'first_name': {
      const parts = value.split(/\s+/);
      return { first_name: parts[0] };
    }
    case 'last_name': {
      const parts = value.split(/\s+/);
      return { last_name: parts.slice(1).join(' ') || value };
    }
    case 'phone':
    case 'email':
    case 'date_of_birth':
    case 'patient_notes': {
      const isSkip = /^(omitir|saltar|no|ninguna?|sin|-)$/i.test(value.trim());
      return { [field]: isSkip ? null : value };
    }
    default:
      return { [field]: value };
  }
}

export class ChatbotService {
  async processMessage(
    request: ChatbotRequest,
    tenantId: string,
    userId: string
  ): Promise<ChatbotResponse> {
    const { message, context } = request;
    let updatedContext = { ...context };

    logger.info(
      { userId, tenantId, message: message.substring(0, 100) },
      'Processing chatbot message'
    );

    // ── Step 1: Handle pending confirmation ───────────────────────────────────
    if (updatedContext.pendingConfirmation) {
      const { pendingConfirmation } = updatedContext;

      if (isConfirmationExpired(pendingConfirmation)) {
        updatedContext = clearPendingConfirmation(updatedContext);
        return {
          response: formatter.confirmationTimeout(),
          context: updatedContext,
        };
      }

      if (isAffirmativeResponse(message)) {
        // Execute the confirmed intent — skip re-confirmation
        updatedContext = clearPendingConfirmation(updatedContext);
        return this.executeIntent(
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
          response: formatter.confirmationDeclined(),
          context: updatedContext,
        };
      }

      // Not a clear yes/no — re-prompt
      return {
        response: pendingConfirmation.prompt,
        context: updatedContext,
      };
    }

    // ── Step 2: Handle pending disambiguation ─────────────────────────────────
    if (updatedContext.pendingDisambiguation) {
      const selectedId = resolveDisambiguationResponse(message, updatedContext);
      const { pendingDisambiguation } = updatedContext;

      if (selectedId) {
        // User selected an option — inject the resolved ID and re-execute
        const resolvedIntent = {
          ...pendingDisambiguation.intent,
          params: {
            ...pendingDisambiguation.intent.params,
            [pendingDisambiguation.field]: selectedId,
          },
        };
        updatedContext = { ...updatedContext };
        delete updatedContext.pendingDisambiguation;
        return this.executeIntent(
          resolvedIntent,
          updatedContext,
          tenantId,
          userId
        );
      }

      // Could not resolve — re-ask
      return {
        response: formatDisambiguationResponse(pendingDisambiguation),
        context: updatedContext,
      };
    }

    // ── Step 3: Handle pending multi-turn parameter collection ────────────────
    if (updatedContext.pendingIntent && updatedContext.accumulatedParams) {
      // User is answering a missing parameter prompt
      const previousIntent = updatedContext.pendingIntent;
      const pendingField = updatedContext.pendingField;

      // Inject the raw message as the value for the field that was being collected.
      // This is the primary mechanism for handling bare answers like "matias maldonado".
      const injectedParams: Record<string, unknown> = pendingField
        ? injectFieldValue(pendingField, message)
        : {};

      // Also re-recognize to pick up any structured params (e.g. dates, times)
      const partialIntent = await intentRecognizer.recognize(message);

      // Merge: injected field takes priority over re-recognized params, both layered
      // on top of previously accumulated params
      const mergedIntent = mergeAccumulatedParams(
        {
          ...previousIntent,
          params: { ...injectedParams, ...partialIntent.params },
        },
        updatedContext
      );

      // Clear pending state and continue
      updatedContext = { ...updatedContext };
      delete updatedContext.pendingIntent;
      delete updatedContext.accumulatedParams;
      delete updatedContext.pendingField;

      return this.executeIntent(mergedIntent, updatedContext, tenantId, userId);
    }

    // ── Step 4: Recognize intent ──────────────────────────────────────────────
    const intent = await intentRecognizer.recognize(message);

    logger.info(
      {
        operation: intent.operation,
        entity: intent.entity,
        confidence: intent.confidence,
      },
      'Intent recognized'
    );

    // Handle special intents
    if (intent.operation === 'reset') {
      return {
        response: formatter.reset(),
        context: clearContext(),
      };
    }

    if (intent.operation === 'help') {
      return {
        response: formatter.help(),
        context: updatedContext,
      };
    }

    if (intent.operation === 'unknown' || intent.confidence < 0.4) {
      return {
        response: formatter.unknown(message),
        context: updatedContext,
      };
    }

    // Resolve pronoun/context references
    const resolvedIntent = resolveReferences(intent, updatedContext);

    return this.executeIntent(resolvedIntent, updatedContext, tenantId, userId);
  }

  private async executeIntent(
    intent: Intent,
    context: ConversationContext,
    tenantId: string,
    userId: string,
    alreadyConfirmed = false
  ): Promise<ChatbotResponse> {
    let updatedContext = { ...context };

    // ── Check for missing required parameters ─────────────────────────────────
    const missingParam = findMissingParam(intent, updatedContext);
    if (missingParam) {
      // Save current progress and ask for missing param
      updatedContext = setPendingIntent(updatedContext, intent, intent.params);
      updatedContext.pendingField = missingParam.field;
      return {
        response: missingParam.prompt,
        context: updatedContext,
      };
    }

    // ── Check if destructive operation needs confirmation ─────────────────────
    if (!alreadyConfirmed && requiresConfirmation(intent)) {
      const entityDetails = await this.fetchEntityDetails(
        intent,
        updatedContext,
        tenantId
      );
      const confirmation = createConfirmation(intent, entityDetails);
      updatedContext = setPendingConfirmation(updatedContext, confirmation);
      return {
        response: confirmation.prompt,
        context: updatedContext,
      };
    }

    // ── Execute the command ───────────────────────────────────────────────────
    const result = await commandExecutor.execute(
      intent,
      updatedContext,
      tenantId,
      userId
    );

    if (!result.success) {
      const response = this.handleExecutionError(
        result.error ?? '',
        result,
        intent,
        updatedContext
      );
      return response;
    }

    // ── Update context with results ───────────────────────────────────────────
    updatedContext = updateContextAfterOperation(updatedContext, {
      patientId: result.patientId,
      appointmentId: result.appointmentId,
      treatmentId: result.treatmentId,
    });

    const response = this.formatSuccessResponse(intent, result.data);

    logger.info(
      { operation: intent.operation, entity: intent.entity, success: true },
      'Command executed successfully'
    );

    return { response, context: updatedContext };
  }

  private handleExecutionError(
    error: string,
    result: { data?: unknown; statusCode?: number },
    intent: Intent,
    context: ConversationContext
  ): ChatbotResponse {
    // Handle disambiguation cases
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
        const updatedContext = {
          ...context,
          pendingDisambiguation: disambiguation,
        };
        return {
          response: formatDisambiguationResponse(disambiguation),
          context: updatedContext,
        };
      }
    }

    if (error === 'AMBIGUOUS_APPOINTMENT') {
      const appointments = Array.isArray(result.data) ? result.data : [];
      if (appointments.length > 0) {
        const disambiguation = createAppointmentDisambiguation(
          intent,
          appointments as Array<{
            id: string;
            patient_first_name?: string;
            patient_last_name?: string;
            scheduled_at: Date | string | null;
            status: string;
          }>,
          context
        );
        const updatedContext = {
          ...context,
          pendingDisambiguation: disambiguation,
        };
        return {
          response: formatDisambiguationResponse(disambiguation),
          context: updatedContext,
        };
      }
    }

    // Handle patient not found during appointment operations
    if (error === 'PATIENT_NOT_FOUND') {
      // If this was an appointment create/update, preserve the date/time and re-ask for patient name
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
      return { response: formatter.errorNotFound('patient'), context };
    }

    // Handle validation errors
    if (error === 'INVALID_DATE') {
      return { response: formatter.errorInvalidDate(), context };
    }
    if (error === 'INVALID_EMAIL') {
      return { response: formatter.errorInvalidEmail(), context };
    }
    if (error === 'INVALID_PHONE') {
      return { response: formatter.errorInvalidPhone(), context };
    }
    if (error === 'INVALID_DURATION') {
      return { response: formatter.errorInvalidDuration(), context };
    }

    // Handle treatment-specific errors
    if (error === 'AMBIGUOUS_TREATMENT') {
      return {
        response:
          'Encontré varios tratamientos con ese nombre. Por favor, sé más específico.',
        context,
      };
    }

    if (error === 'TREATMENT_NOT_FOUND') {
      return {
        response:
          'No se encontró ningún tratamiento con ese nombre. ¿Podría verificar el nombre del tratamiento?',
        context,
      };
    }

    if (error === 'MISSING_NAME' && intent.entity === 'treatment') {
      return {
        response: '¿Cuál es el nombre del tratamiento?',
        context,
      };
    }

    if (error === 'MISSING_PRICE' && intent.entity === 'treatment') {
      return {
        response: '¿Cuál es el precio del tratamiento (en pesos)?',
        context,
      };
    }

    // Handle not found
    if (error === 'NOT_FOUND' || result.statusCode === 404) {
      return {
        response: formatter.errorNotFound(intent.entity),
        context,
      };
    }

    return {
      response: formatter.errorGeneral(error),
      context,
    };
  }

  private formatSuccessResponse(intent: Intent, data: unknown): string {
    const { operation, entity } = intent;

    switch (entity) {
      case 'appointment': {
        const apt = data as Record<string, unknown>;
        if (operation === 'create') return formatter.appointmentCreated(apt);
        if (operation === 'list' || operation === 'search') {
          const list = Array.isArray(data) ? data : [];
          return formatter.appointmentsList(list as Record<string, unknown>[]);
        }
        if (operation === 'read') return formatter.appointmentDetail(apt);
        if (operation === 'update') {
          if (intent.params.status === 'cancelled') {
            return formatter.appointmentCancelled(apt);
          }
          return formatter.appointmentUpdated(apt);
        }
        if (operation === 'delete') {
          if (Array.isArray(data)) {
            const count = data.length;
            return `✅ Se cancelaron ${count} turno${count !== 1 ? 's' : ''} correctamente.`;
          }
          return formatter.appointmentCancelled(apt);
        }
        break;
      }
      case 'patient': {
        const patient = data as Record<string, unknown>;
        if (operation === 'create') return formatter.patientCreated(patient);
        if (operation === 'list') {
          const list = Array.isArray(data) ? data : [];
          return formatter.patientsList(list as Record<string, unknown>[]);
        }
        if (operation === 'search') {
          const list = Array.isArray(data) ? data : [];
          return formatter.patientsList(list as Record<string, unknown>[]);
        }
        if (operation === 'read') {
          const patientDetail = patient as {
            patient?: Record<string, unknown>;
          };
          return formatter.patientDetail(
            (patientDetail.patient ?? patient) as Record<string, unknown>
          );
        }
        if (operation === 'update') return formatter.patientUpdated(patient);
        if (operation === 'delete') return formatter.patientDeleted(patient);
        break;
      }
      case 'session': {
        // Format session history
        const sessions = Array.isArray(data) ? data : [];
        if (sessions.length === 0) {
          return 'No se encontraron sesiones previas para este paciente.';
        }
        const items = sessions
          .slice(0, 10)
          .map((s: Record<string, unknown>) => {
            const date = s.scheduled_at
              ? formatDateTimeES(String(s.scheduled_at))
              : 'Fecha no disponible';
            const procedures = s.procedures_performed
              ? String(s.procedures_performed)
              : 'Sin procedimientos registrados';
            return `• **${date}:** ${procedures}`;
          })
          .join('\n');
        return `📋 **Historial de sesiones:**\n\n${items}`;
      }
      case 'treatment': {
        const treatment = data as Record<string, unknown>;
        if (operation === 'create')
          return formatter.treatmentCreated(treatment);
        if (operation === 'list' || operation === 'search') {
          const list = Array.isArray(data) ? data : [];
          return formatter.treatmentsList(list as Record<string, unknown>[]);
        }
        if (operation === 'read') return formatter.treatmentDetail(treatment);
        if (operation === 'update')
          return formatter.treatmentUpdated(treatment);
        if (operation === 'delete')
          return formatter.treatmentDeleted(treatment);
        break;
      }
    }

    return '✅ Operación realizada correctamente.';
  }

  /**
   * Fetches entity details for confirmation messages (patient name, appointment date).
   */
  private async fetchEntityDetails(
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
          if (result) {
            return {
              patientName: `${result.patient.first_name} ${result.patient.last_name}`,
            };
          }
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
            const patientName =
              result.patient_first_name && result.patient_last_name
                ? `${result.patient_first_name} ${result.patient_last_name}`
                : undefined;
            const dateTime = result.scheduled_at
              ? formatDateTimeES(String(result.scheduled_at))
              : undefined;
            return { patientName, dateTime };
          }
        }
      }
    } catch {
      // Non-critical — confirmation will use generic message
    }

    return {};
  }
}
