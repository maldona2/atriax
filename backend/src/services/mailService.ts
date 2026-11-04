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
import { loadMailConfig } from './mailer/config.js';
import { createMailer } from './mailer/mailer.js';

const MAIL_ENV_KEYS = ['MAIL_FROM', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];

/**
 * No mail env at all → null: sends reject with "Mail not configured" and the
 * app keeps running. Any partial or invalid config throws at import instead.
 */
function mailerFromEnv(): ReturnType<typeof createMailer> | null {
  if (!MAIL_ENV_KEYS.some((key) => process.env[key])) {
    return null;
  }
  return createMailer(loadMailConfig());
}

const mailer = mailerFromEnv();

export function isMailConfigured(): boolean {
  return mailer !== null;
}

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
  if (!mailer) {
    const error = 'Mail not configured';
    logger.warn('%s, skipping email: %s', error, subject);
    throw new Error(error);
  }
  if (!to) {
    const error = 'No recipient address';
    logger.warn('Email send skipped: %s for "%s"', error, subject);
    throw new Error(error);
  }

  // The mailer logs success and failure (masked recipient, SMTP response).
  await mailer.sendMail({
    to,
    subject,
    html,
    text,
    ...(attachments &&
      attachments.length > 0 && {
        attachments: attachments.map(({ filename, content, type }) => ({
          filename,
          content,
          contentType: type,
        })),
      }),
  });
}

/** Fire-and-forget: send() already logs, so drop the rejection. */
function sendInBackground(...args: Parameters<typeof send>): void {
  send(...args).catch(() => undefined);
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
  sendInBackground(to, tpl.subject, tpl.html, tpl.text, attachments);
}

export function sendAppointmentConfirmed(
  to: string,
  data: AppointmentEmailData,
  appointmentId: string
): void {
  const tpl = confirmedTemplate(data);
  const attachment = generateICSAttachment(appointmentId, to, data, false);
  const attachments = attachment ? [attachment] : undefined;
  sendInBackground(to, tpl.subject, tpl.html, tpl.text, attachments);
}

export function sendAppointmentCancelled(
  to: string,
  data: AppointmentEmailData,
  appointmentId: string
): void {
  const tpl = cancelledTemplate(data);
  const attachment = generateICSAttachment(appointmentId, to, data, true);
  const attachments = attachment ? [attachment] : undefined;
  sendInBackground(to, tpl.subject, tpl.html, tpl.text, attachments);
}

export async function sendAppointmentReminder(
  to: string,
  data: AppointmentEmailData,
  appointmentId: string
): Promise<void> {
  const tpl = reminderTemplate(data);
  const attachment = generateICSAttachment(appointmentId, to, data, false);
  const attachments = attachment ? [attachment] : undefined;
  await send(to, tpl.subject, tpl.html, tpl.text, attachments);
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
