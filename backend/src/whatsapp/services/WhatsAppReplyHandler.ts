/**
 * WhatsAppReplyHandler - Handles inbound patient replies to notification messages.
 *
 * No chatbot, no sessions — pure keyword matching:
 *   "SI" / "CONFIRMAR"  → confirms the most recent pending appointment
 *   "CANCELAR" / "NO"   → cancels  the most recent pending appointment
 *   anything else       → silently ignored
 *
 * Tenant resolution uses WHATSAPP_DEFAULT_TENANT_ID (single-tenant mode).
 */

import { and, desc, eq, or } from 'drizzle-orm';
import { db, appointments, patients, users } from '../../db/client.js';
import { update as updateAppointment } from '../../services/appointmentService.js';
import { MetaAPIClient } from './MetaAPIClient.js';
import { replyConfirmedMessage, replyCancelledMessage } from '../templates.js';
import logger from '../../utils/logger.js';

type ReplyAction = 'confirm' | 'cancel' | 'ignore';

function parseKeyword(text: string): ReplyAction {
  const normalized = text.trim().toUpperCase();
  if (normalized === 'SI' || normalized === 'CONFIRMAR') return 'confirm';
  if (normalized === 'CANCELAR' || normalized === 'NO') return 'cancel';
  return 'ignore';
}

export class WhatsAppReplyHandler {
  private readonly client: MetaAPIClient;

  constructor(client = new MetaAPIClient()) {
    this.client = client;
  }

  /**
   * Process an inbound message from a patient.
   * Tenant is resolved automatically from the patient's phone number —
   * no WHATSAPP_DEFAULT_TENANT_ID env var required.
   *
   * @param fromPhone - Patient's phone number as received from Meta (E.164, no leading +)
   * @param text      - Raw message text
   */
  async handle(
    _tenantId: string, // kept for backwards-compat with the route; ignored
    fromPhone: string,
    text: string
  ): Promise<void> {
    const action = parseKeyword(text);
    if (action === 'ignore') return;

    // Normalise: Meta sends digits without '+', patients table may store with '+'
    const phoneVariants = [fromPhone, `+${fromPhone}`];

    // Resolve tenant from the patient's phone — works across all tenants
    const [patient] = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        tenantId: patients.tenantId,
      })
      .from(patients)
      .where(
        or(
          eq(patients.phone, phoneVariants[0]!),
          eq(patients.phone, phoneVariants[1]!)
        )
      )
      .limit(1);

    if (!patient) {
      logger.warn(
        { fromPhone },
        'WhatsAppReplyHandler: no patient found for phone'
      );
      return;
    }

    const tenantId = patient.tenantId!;

    // Find most recent pending appointment for this patient
    const [appointment] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          eq(appointments.patientId, patient.id),
          eq(appointments.status, 'pending')
        )
      )
      .orderBy(desc(appointments.scheduledAt))
      .limit(1);

    if (!appointment) {
      logger.info(
        { tenantId, patientId: patient.id },
        'WhatsAppReplyHandler: no pending appointment found'
      );
      return;
    }

    // Fetch professional name for the reply message
    const [professional] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .limit(1);

    const professionalName = professional?.fullName ?? 'el profesional';

    const newStatus = action === 'confirm' ? 'confirmed' : 'cancelled';

    try {
      await updateAppointment(tenantId, appointment.id, { status: newStatus });
    } catch (err) {
      logger.error(
        { err, appointmentId: appointment.id, action },
        'WhatsAppReplyHandler: failed to update appointment status'
      );
      return;
    }

    // Reply to the patient
    const replyText =
      action === 'confirm'
        ? replyConfirmedMessage(professionalName)
        : replyCancelledMessage(professionalName);

    const result = await this.client.sendTextMessage(fromPhone, replyText);
    if (!result.success) {
      logger.warn(
        { fromPhone, error: result.error },
        'WhatsAppReplyHandler: failed to send reply'
      );
    }
  }
}

export const whatsAppReplyHandler = new WhatsAppReplyHandler();
