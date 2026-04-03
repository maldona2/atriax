/**
 * ConversationManager - Handles context tracking and reference resolution.
 */

import type { ConversationContext, Intent } from '../types.js';

const CONTEXT_PLACEHOLDER = '__CONTEXT__';

/**
 * Resolves references ("él", "ella", "ese paciente", "esa cita") using
 * the conversation context. Mutates params in-place with resolved IDs.
 */
export function resolveReferences(
  intent: Intent,
  context: ConversationContext
): Intent {
  const params = { ...intent.params };

  // Resolve patient reference
  if (params.patient_id === CONTEXT_PLACEHOLDER && context.lastPatientId) {
    params.patient_id = context.lastPatientId;
  }

  // Resolve appointment reference
  if (
    params.appointment_id === CONTEXT_PLACEHOLDER &&
    context.lastAppointmentId
  ) {
    params.appointment_id = context.lastAppointmentId;
  }

  // If patient reference in text but no explicit name/id, use last known patient
  if (
    !params.patient_id &&
    !params.patient_name &&
    !params.first_name &&
    !params.search_query &&
    context.lastPatientId &&
    (intent.entity === 'appointment' || intent.entity === 'session')
  ) {
    // Only inject if it makes sense (create appointment → use last patient)
    if (intent.operation === 'create' && intent.entity === 'appointment') {
      params.patient_id = context.lastPatientId;
    }
  }

  return { ...intent, params };
}

/**
 * Merges accumulated params from previous turns with the current intent params.
 * Used for multi-turn parameter collection.
 */
export function mergeAccumulatedParams(
  intent: Intent,
  context: ConversationContext
): Intent {
  if (!context.accumulatedParams || !context.pendingIntent) {
    return intent;
  }

  // Merge pending intent params with current message params
  // Current message params take precedence
  const merged = {
    ...context.accumulatedParams,
    ...intent.params,
  };

  return { ...intent, params: merged };
}

/**
 * Updates the context after a successful operation.
 */
export function updateContextAfterOperation(
  context: ConversationContext,
  result: {
    patientId?: string;
    appointmentId?: string;
  }
): ConversationContext {
  const updated = { ...context };

  // Clear pending states
  delete updated.pendingIntent;
  delete updated.pendingConfirmation;
  delete updated.pendingDisambiguation;
  delete updated.accumulatedParams;

  // Update last known IDs
  if (result.patientId) {
    updated.lastPatientId = result.patientId;
  }
  if (result.appointmentId) {
    updated.lastAppointmentId = result.appointmentId;
  }

  return updated;
}

/**
 * Updates context to accumulate params for multi-turn collection.
 */
export function setPendingIntent(
  context: ConversationContext,
  intent: Intent,
  collectedParams: Record<string, unknown>
): ConversationContext {
  return {
    ...context,
    pendingIntent: intent,
    accumulatedParams: {
      ...(context.accumulatedParams ?? {}),
      ...collectedParams,
    },
  };
}

/**
 * Clears all conversation context (reset command).
 */
export function clearContext(): ConversationContext {
  return {};
}

/**
 * Checks if the current message is a response to a pending disambiguation.
 * Returns the selected option ID or null.
 */
export function resolveDisambiguationResponse(
  message: string,
  context: ConversationContext
): string | null {
  if (!context.pendingDisambiguation) return null;

  const { options } = context.pendingDisambiguation;
  const trimmed = message.trim().toLowerCase();

  // Try numeric selection (1, 2, 3...)
  const numMatch = trimmed.match(/^(\d+)$/);
  if (numMatch) {
    const idx = parseInt(numMatch[1], 10) - 1;
    if (idx >= 0 && idx < options.length) {
      return options[idx].id;
    }
    // Out-of-range number: don't fall through to name matching
    return null;
  }

  // Try matching by label (partial name match — at least 3 chars to avoid false positives)
  if (trimmed.length >= 3) {
    for (const opt of options) {
      if (opt.label.toLowerCase().includes(trimmed)) {
        return opt.id;
      }
    }
  }

  return null;
}

/**
 * Checks if the message is an affirmative confirmation response.
 */
export function isAffirmativeResponse(message: string): boolean {
  const lower = message.toLowerCase().trim();
  // Use (\s|$) instead of \b to handle accented characters (í, etc.)
  const affirmativePatterns =
    /^(s[ií]|sip|dale|claro|confirmar?|confirmo|acepto|ok|oks?|perfecto|adelante|proceder?|procedo|correcto|exacto)(\s|$)/;
  return affirmativePatterns.test(lower);
}

/**
 * Checks if the message is a negative confirmation response.
 */
export function isNegativeResponse(message: string): boolean {
  const lower = message.toLowerCase().trim();
  const negativePatterns =
    /^(no|nope|cancelar?|cancelo|abortar?|aborto|detener?|detengo|parar?|para|stop)(\s|$)/;
  return negativePatterns.test(lower);
}
