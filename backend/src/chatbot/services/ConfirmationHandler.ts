/**
 * ConfirmationHandler - Manages confirmation flow for destructive operations.
 */

import type {
  Intent,
  PendingConfirmation,
  ConversationContext,
} from '../types.js';
import { CONFIRMATION_TIMEOUT_MS, DESTRUCTIVE_OPERATIONS } from '../types.js';
import { ResponseFormatter } from './ResponseFormatter.js';

const formatter = new ResponseFormatter();

/**
 * Returns true if the intent requires a confirmation step.
 */
export function requiresConfirmation(intent: Intent): boolean {
  // Delete operations always require confirmation
  if (intent.operation === 'delete') return true;

  // Cancel appointment (update with status=cancelled)
  if (
    intent.operation === 'update' &&
    intent.entity === 'appointment' &&
    intent.params.status === 'cancelled'
  ) {
    return true;
  }

  // Check DESTRUCTIVE_OPERATIONS list for explicit entries
  return DESTRUCTIVE_OPERATIONS.some(
    (d) =>
      d.operation === intent.operation &&
      d.entity === intent.entity &&
      intent.operation === 'delete'
  );
}

/**
 * Creates a PendingConfirmation object for the given intent.
 */
export function createConfirmation(
  intent: Intent,
  entityDetails: {
    patientName?: string;
    dateTime?: string;
  } = {}
): PendingConfirmation {
  const expiresAt = Date.now() + CONFIRMATION_TIMEOUT_MS;

  let prompt: string;

  if (intent.operation === 'delete' && intent.entity === 'patient') {
    const name = entityDetails.patientName ?? 'este paciente';
    prompt = formatter.confirmationDeletePatientRequest(name);
  } else if (
    intent.operation === 'update' &&
    intent.entity === 'appointment' &&
    intent.params.status === 'cancelled'
  ) {
    const name = entityDetails.patientName ?? 'el paciente';
    const dateTime = entityDetails.dateTime ?? 'esta fecha';
    prompt = formatter.confirmationCancellationRequest(name, dateTime);
  } else if (intent.operation === 'delete' && intent.entity === 'appointment') {
    const name = entityDetails.patientName;
    const dateTime =
      entityDetails.dateTime ?? (intent.params.date as string | undefined);
    let message: string;
    if (name) {
      message = `Estás por eliminar el turno de **${name}**${dateTime ? ` del **${dateTime}**` : ''}.`;
    } else if (dateTime) {
      message = `Estás por cancelar **todos los turnos** del **${dateTime}**.`;
    } else {
      message = 'Estás por eliminar un turno.';
    }
    prompt = formatter.confirmationRequest(
      message,
      'Esta acción es irreversible.'
    );
  } else {
    prompt = formatter.confirmationRequest(
      'Estás por realizar una acción irreversible.',
      '¿Deseas continuar?'
    );
  }

  return { intent, prompt, expiresAt };
}

/**
 * Checks if a pending confirmation has expired.
 */
export function isConfirmationExpired(
  confirmation: PendingConfirmation
): boolean {
  return Date.now() > confirmation.expiresAt;
}

/**
 * Sets the pending confirmation in context.
 */
export function setPendingConfirmation(
  context: ConversationContext,
  confirmation: PendingConfirmation
): ConversationContext {
  return { ...context, pendingConfirmation: confirmation };
}

/**
 * Clears the pending confirmation from context.
 */
export function clearPendingConfirmation(
  context: ConversationContext
): ConversationContext {
  const updated = { ...context };
  delete updated.pendingConfirmation;
  return updated;
}
