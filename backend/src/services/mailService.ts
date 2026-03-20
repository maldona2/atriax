import { Resend } from 'resend';
import logger from '../utils/logger.js';
import {
  bookedTemplate,
  confirmedTemplate,
  cancelledTemplate,
  reminderTemplate,
  verificationTemplate,
  welcomeTemplate,
  passwordResetTemplate,
  type AppointmentEmailData,
} from './emailTemplates.js';
import { generateICS, type ICSGeneratorOptions } from './icsGenerator.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const RESEND_FROM = process.env.RESEND_FROM ?? 'Atriax <noreply@anamnesia.pro>';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export interface EmailAttachment {
  filename: string;
  content: string;
  type: string;
}

async function send(
  to: string,
  subject: string,
  html: string,
  text: string,
  attachments?: EmailAttachment[]
): Promise<void> {
  if (!RESEND_API_KEY || !resend) {
    logger.warn('Resend not configured, skipping email to %s: %s', to, subject);
    return;
  }
  if (!to) {
    logger.warn('Email send skipped: no recipient address for "%s"', subject);
    return;
  }

  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to,
      subject,
      html,
      text,
      ...(attachments && attachments.length > 0 && { attachments }),
    });
    logger.info('Email sent to %s: %s', to, subject);
  } catch (err) {
    logger.error({ err }, 'Failed to send email to %s: %s', to, subject);
  }
}

/**
 * Generates an ICS calendar attachment from appointment data.
 *
 * Creates an RFC 5545-compliant iCalendar file that can be attached to emails.
 * Handles both regular appointments and cancellations.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 *
 * @param appointmentId - Unique identifier for the appointment
 * @param patientEmail - Patient's email address
 * @param data - Appointment email data
 * @param isCancellation - Whether this is a cancellation event
 * @returns EmailAttachment object with ICS file, or null if generation fails
 */
function generateICSAttachment(
  appointmentId: string,
  patientEmail: string,
  data: AppointmentEmailData,
  isCancellation: boolean = false
): EmailAttachment | null {
  try {
    const icsOptions: ICSGeneratorOptions = {
      appointmentId,
      patientName: data.patientName,
      patientEmail,
      professionalName: data.professionalName,
      scheduledAt: data.scheduledAt,
      durationMinutes: data.durationMinutes,
      notes: data.notes,
      isCancellation,
    };

    const icsContent = generateICS(icsOptions);

    return {
      filename: 'appointment.ics',
      content: icsContent,
      type: 'text/calendar',
    };
  } catch (err) {
    logger.error(
      { err },
      'Failed to generate ICS attachment for appointment %s',
      appointmentId
    );
    return null;
  }
}

export function sendAppointmentBooked(
  to: string,
  data: AppointmentEmailData,
  appointmentId: string
): void {
  const tpl = bookedTemplate(data);
  const attachment = generateICSAttachment(appointmentId, to, data, false);
  const attachments = attachment ? [attachment] : undefined;
  void send(to, tpl.subject, tpl.html, tpl.text, attachments);
}

export function sendAppointmentConfirmed(
  to: string,
  data: AppointmentEmailData,
  appointmentId: string
): void {
  const tpl = confirmedTemplate(data);
  const attachment = generateICSAttachment(appointmentId, to, data, false);
  const attachments = attachment ? [attachment] : undefined;
  void send(to, tpl.subject, tpl.html, tpl.text, attachments);
}

export function sendAppointmentCancelled(
  to: string,
  data: AppointmentEmailData,
  appointmentId: string
): void {
  const tpl = cancelledTemplate(data);
  const attachment = generateICSAttachment(appointmentId, to, data, true);
  const attachments = attachment ? [attachment] : undefined;
  void send(to, tpl.subject, tpl.html, tpl.text, attachments);
}

export function sendAppointmentReminder(
  to: string,
  data: AppointmentEmailData,
  appointmentId: string
): void {
  const tpl = reminderTemplate(data);
  const attachment = generateICSAttachment(appointmentId, to, data, false);
  const attachments = attachment ? [attachment] : undefined;
  void send(to, tpl.subject, tpl.html, tpl.text, attachments);
}

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  verifyUrl: string
): Promise<void> {
  const tpl = verificationTemplate(firstName, verifyUrl);
  await send(email, tpl.subject, tpl.html, tpl.text);
}

export async function sendWelcomeEmail(
  email: string,
  firstName: string
): Promise<void> {
  const tpl = welcomeTemplate(firstName);
  await send(email, tpl.subject, tpl.html, tpl.text);
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<void> {
  const tpl = passwordResetTemplate(resetUrl);
  await send(email, tpl.subject, tpl.html, tpl.text);
}
