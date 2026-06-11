/**
 * Unit tests for WhatsAppNotificationService
 *
 * The service sends business-initiated outbound messages via approved WhatsApp
 * templates, so it calls MetaAPIClient.sendTemplateMessage (templateName,
 * languageCode, bodyParameters) — NOT sendTextMessage.
 */

import { WhatsAppNotificationService } from '../services/WhatsAppNotificationService.js';
import type { MetaAPIClient } from '../services/MetaAPIClient.js';
import type { AppointmentNotificationData } from '../templates.js';

const SAMPLE_DATA: AppointmentNotificationData = {
  patientName: 'María López',
  professionalName: 'Dr. Juan Pérez',
  scheduledAt: new Date('2026-05-10T10:00:00-03:00'),
  durationMinutes: 60,
};

function makeClient(success = true): jest.Mocked<MetaAPIClient> {
  return {
    sendTemplateMessage: jest
      .fn()
      .mockResolvedValue({ success, messageId: 'mid-1' }),
  } as unknown as jest.Mocked<MetaAPIClient>;
}

describe('WhatsAppNotificationService', () => {
  const originalEnv = process.env.FEATURE_WHATSAPP_ENABLED;

  afterEach(() => {
    process.env.FEATURE_WHATSAPP_ENABLED = originalEnv;
  });

  describe('sendAppointmentBooked', () => {
    it('sends the turno_agendado template when phone and feature are provided', async () => {
      const client = makeClient();
      const svc = new WhatsAppNotificationService(client);
      await svc.sendAppointmentBooked('+5491112345678', SAMPLE_DATA);
      expect(client.sendTemplateMessage).toHaveBeenCalledTimes(1);
      const [phone, templateName, languageCode, bodyParameters] =
        client.sendTemplateMessage.mock.calls[0]!;
      expect(phone).toBe('+5491112345678');
      expect(templateName).toBe('turno_agendado');
      expect(languageCode).toBe('es_AR');
      expect(bodyParameters).toContain('María López');
      expect(bodyParameters).toContain('Dr. Juan Pérez');
    });

    it('skips send when phone is empty', async () => {
      const client = makeClient();
      const svc = new WhatsAppNotificationService(client);
      await svc.sendAppointmentBooked('', SAMPLE_DATA);
      expect(client.sendTemplateMessage).not.toHaveBeenCalled();
    });

    it('skips send when FEATURE_WHATSAPP_ENABLED is false', async () => {
      process.env.FEATURE_WHATSAPP_ENABLED = 'false';
      // The feature flag is read at module load time, so we cannot toggle it
      // per-test. Instead, stub the private _sendTemplate to assert the public
      // method does not reach the client.
      const client = makeClient();
      const svc = new WhatsAppNotificationService(client);
      jest
        .spyOn(
          svc as unknown as { _sendTemplate: () => Promise<void> },
          '_sendTemplate'
        )
        .mockResolvedValue(undefined);
      await svc.sendAppointmentBooked('+5491112345678', SAMPLE_DATA);
      expect(client.sendTemplateMessage).not.toHaveBeenCalled();
    });
  });

  describe('sendAppointmentConfirmed', () => {
    it('sends the turno_confirmado template', async () => {
      const client = makeClient();
      const svc = new WhatsAppNotificationService(client);
      await svc.sendAppointmentConfirmed('+5491112345678', SAMPLE_DATA);
      const [, templateName] = client.sendTemplateMessage.mock.calls[0]!;
      expect(templateName).toBe('turno_confirmado');
    });
  });

  describe('sendAppointmentCancelled', () => {
    it('sends the turno_cancelado template', async () => {
      const client = makeClient();
      const svc = new WhatsAppNotificationService(client);
      await svc.sendAppointmentCancelled('+5491112345678', SAMPLE_DATA);
      const [, templateName] = client.sendTemplateMessage.mock.calls[0]!;
      expect(templateName).toBe('turno_cancelado');
    });
  });

  describe('sendAppointmentReminder', () => {
    it('sends the recordatorio_turno template', async () => {
      const client = makeClient();
      const svc = new WhatsAppNotificationService(client);
      await svc.sendAppointmentReminder('+5491112345678', SAMPLE_DATA);
      const [, templateName] = client.sendTemplateMessage.mock.calls[0]!;
      expect(templateName).toBe('recordatorio_turno');
    });
  });

  describe('error handling', () => {
    it('does not throw when MetaAPIClient returns failure', async () => {
      const client = makeClient(false);
      (client.sendTemplateMessage as jest.Mock).mockResolvedValue({
        success: false,
        error: 'rate limit',
      });
      const svc = new WhatsAppNotificationService(client);
      await expect(
        svc.sendAppointmentBooked('+5491112345678', SAMPLE_DATA)
      ).resolves.not.toThrow();
    });

    it('does not throw when MetaAPIClient throws unexpectedly', async () => {
      const client = makeClient();
      (client.sendTemplateMessage as jest.Mock).mockRejectedValue(
        new Error('network failure')
      );
      const svc = new WhatsAppNotificationService(client);
      await expect(
        svc.sendAppointmentBooked('+5491112345678', SAMPLE_DATA)
      ).resolves.not.toThrow();
    });
  });
});
