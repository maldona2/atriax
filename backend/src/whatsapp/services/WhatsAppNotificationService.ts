/**
 * WhatsAppNotificationService - Outbound patient notification channel via WhatsApp.
 *
 * Uses pre-approved Meta message templates for all business-initiated messages.
 * All sends are fire-and-forget safe: errors are logged and swallowed so a
 * failed WhatsApp send never breaks an appointment operation.
 *
 * Usage:
 *   const wa = new WhatsAppNotificationService();
 *   void wa.sendAppointmentBooked(patient.phone, notificationData);
 */

import { MetaAPIClient } from './MetaAPIClient.js';
import {
  appointmentBookedTemplate,
  appointmentConfirmedTemplate,
  appointmentCancelledTemplate,
  appointmentReminderTemplate,
  cycleReminderTemplate,
  type AppointmentNotificationData,
  type CycleReminderData,
  type WhatsAppTemplateMessage,
} from '../templates.js';
import logger from '../../utils/logger.js';

export type { AppointmentNotificationData, CycleReminderData };

const featureEnabled =
  (process.env.FEATURE_WHATSAPP_ENABLED ?? 'true').toLowerCase() !== 'false';

export class WhatsAppNotificationService {
  private readonly client: MetaAPIClient;

  constructor(client = new MetaAPIClient()) {
    this.client = client;
  }

  async sendAppointmentBooked(
    phone: string,
    data: AppointmentNotificationData
  ): Promise<boolean> {
    return this._sendTemplate(phone, appointmentBookedTemplate(data), 'booked');
  }

  async sendAppointmentConfirmed(
    phone: string,
    data: AppointmentNotificationData
  ): Promise<boolean> {
    return this._sendTemplate(
      phone,
      appointmentConfirmedTemplate(data),
      'confirmed'
    );
  }

  async sendAppointmentCancelled(
    phone: string,
    data: AppointmentNotificationData
  ): Promise<boolean> {
    return this._sendTemplate(
      phone,
      appointmentCancelledTemplate(data),
      'cancelled'
    );
  }

  async sendAppointmentReminder(
    phone: string,
    data: AppointmentNotificationData
  ): Promise<boolean> {
    return this._sendTemplate(
      phone,
      appointmentReminderTemplate(data),
      'reminder'
    );
  }

  async sendCycleReminder(
    phone: string,
    data: CycleReminderData
  ): Promise<boolean> {
    return this._sendTemplate(phone, cycleReminderTemplate(data), 'cycle');
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  /** Returns true only when Meta accepted the message. */
  private async _sendTemplate(
    phone: string,
    template: WhatsAppTemplateMessage,
    type: string
  ): Promise<boolean> {
    if (!featureEnabled) {
      logger.debug(
        { type },
        'WhatsAppNotificationService: feature disabled, skipping'
      );
      return false;
    }

    if (!phone) {
      logger.debug(
        { type },
        'WhatsAppNotificationService: no phone number, skipping'
      );
      return false;
    }

    try {
      const result = await this.client.sendTemplateMessage(
        phone,
        template.templateName,
        template.languageCode,
        template.bodyParameters
      );
      if (!result.success) {
        logger.warn(
          { type, phone, error: result.error },
          'WhatsAppNotificationService: send failed'
        );
      }
      return result.success;
    } catch (err) {
      logger.error(
        { err, type, phone },
        'WhatsAppNotificationService: unexpected error'
      );
      return false;
    }
  }
}

export const whatsAppNotificationService = new WhatsAppNotificationService();
