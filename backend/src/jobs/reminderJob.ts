import { and, between, eq, inArray } from 'drizzle-orm';
import {
  db,
  appointments,
  patients,
  users,
  whatsappVerifications,
} from '../db/client.js';
import { sendAppointmentReminder } from '../services/mailService.js';
import {
  hasReminderBeenSent,
  checkOptOut,
  recordDelivery,
  getSuccessRate,
} from '../services/reminderService.js';
import { MetaAPIClient } from '../whatsapp/services/MetaAPIClient.js';
import logger from '../utils/logger.js';

const metaClient = new MetaAPIClient();

const BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [60_000, 300_000, 900_000]; // 1min, 5min, 15min

async function sendWithRetry(
  patientEmail: string,
  data: Parameters<typeof sendAppointmentReminder>[1],
  appointmentId: string
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      sendAppointmentReminder(patientEmail, data, appointmentId);
      return;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAYS_MS[attempt])
        );
      }
    }
  }
  throw lastError;
}

/**
 * Sends 24-hour reminder emails for all non-cancelled appointments
 * scheduled between now+23h and now+25h that have a patient email.
 * Uses reminderService to skip duplicates and opted-out patients.
 * Processes in batches of 100 and records delivery status.
 */
export async function sendReminders(): Promise<void> {
  const startTime = Date.now();
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  logger.info(
    'Running reminder job for appointments between %s and %s',
    windowStart.toISOString(),
    windowEnd.toISOString()
  );

  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  try {
    const rows = await db
      .select({
        appointmentId: appointments.id,
        tenantId: appointments.tenantId,
        scheduledAt: appointments.scheduledAt,
        durationMinutes: appointments.durationMinutes,
        patientId: appointments.patientId,
        patientEmail: patients.email,
        patientPhone: patients.phone,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(
        and(
          between(appointments.scheduledAt, windowStart, windowEnd),
          inArray(appointments.status, ['pending', 'confirmed'])
        )
      );

    if (rows.length === 0) {
      logger.info('Reminder job: no appointments to remind');
      return;
    }

    // Fetch professional names per tenant (one query)
    const tenantIds = [...new Set(rows.map((r) => r.tenantId))];
    const professionals = await db
      .select({
        tenantId: users.tenantId,
        fullName: users.fullName,
        subscriptionPlan: users.subscriptionPlan,
        subscriptionStatus: users.subscriptionStatus,
        userId: users.id,
      })
      .from(users)
      .where(
        and(
          inArray(users.tenantId as typeof users.tenantId, tenantIds),
          eq(users.role, 'professional')
        )
      );

    // Fetch verified WhatsApp phones for Gold plan professionals
    const goldUserIds = professionals
      .filter(
        (p) =>
          p.subscriptionPlan === 'gold' && p.subscriptionStatus === 'active'
      )
      .map((p) => p.userId)
      .filter((id): id is string => id !== null);

    const whatsappPhones =
      goldUserIds.length > 0
        ? await db
            .select({
              userId: whatsappVerifications.userId,
              phoneNumber: whatsappVerifications.phoneNumber,
            })
            .from(whatsappVerifications)
            .where(
              and(
                inArray(whatsappVerifications.userId, goldUserIds),
                eq(whatsappVerifications.isVerified, true)
              )
            )
        : [];

    const whatsappPhoneByTenant = new Map<string, string>();
    for (const prof of professionals) {
      const wp = whatsappPhones.find((w) => w.userId === prof.userId);
      if (wp && prof.tenantId) {
        whatsappPhoneByTenant.set(prof.tenantId, wp.phoneNumber);
      }
    }

    const profByTenant = new Map(
      professionals.map((p) => [p.tenantId, p.fullName])
    );

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      for (const row of batch) {
        try {
          // Handle missing email
          if (!row.patientEmail) {
            await recordDelivery({
              tenantId: row.tenantId,
              appointmentId: row.appointmentId,
              patientId: row.patientId,
              patientEmail: '',
              status: 'skipped',
              errorMessage: 'no email address',
            });
            totalSkipped++;
            continue;
          }

          // Skip if already sent
          const alreadySent = await hasReminderBeenSent(row.appointmentId);
          if (alreadySent) {
            totalSkipped++;
            continue;
          }

          // Skip opted-out patients
          const optedOut = await checkOptOut(row.tenantId, row.patientId);
          if (optedOut) {
            totalSkipped++;
            continue;
          }

          const professionalName =
            profByTenant.get(row.tenantId) ?? 'El profesional';
          const emailData = {
            patientName: `${row.patientFirstName} ${row.patientLastName}`,
            professionalName,
            scheduledAt: row.scheduledAt ?? new Date(),
            durationMinutes: row.durationMinutes ?? 60,
          };

          let retryCount = 0;
          let sendError: string | null = null;

          try {
            await sendWithRetry(row.patientEmail, emailData, row.appointmentId);
          } catch (err) {
            retryCount = MAX_RETRIES;
            sendError = err instanceof Error ? err.message : String(err);
          }

          if (sendError) {
            await recordDelivery({
              tenantId: row.tenantId,
              appointmentId: row.appointmentId,
              patientId: row.patientId,
              patientEmail: row.patientEmail,
              status: 'failed',
              errorMessage: sendError,
              retryCount,
            });
            totalFailed++;
          } else {
            await recordDelivery({
              tenantId: row.tenantId,
              appointmentId: row.appointmentId,
              patientId: row.patientId,
              patientEmail: row.patientEmail,
              status: 'sent',
              retryCount,
            });
            totalSent++;

            // Send WhatsApp reminder if the tenant has a verified Gold plan phone
            const patientPhone = row.patientPhone;
            if (patientPhone && whatsappPhoneByTenant.has(row.tenantId)) {
              const professionalName =
                profByTenant.get(row.tenantId) ?? 'El profesional';
              const scheduledDate = (
                row.scheduledAt ?? new Date()
              ).toLocaleString('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires',
                dateStyle: 'full',
                timeStyle: 'short',
              });
              const whatsappText =
                `🏥 *Recordatorio de turno*\n\n` +
                `Hola ${row.patientFirstName}, te recordamos que tienes un turno mañana.\n\n` +
                `👨‍⚕️ *Profesional:* ${professionalName}\n` +
                `📅 *Fecha y hora:* ${scheduledDate}\n` +
                `⏱ *Duración:* ${row.durationMinutes ?? 60} min\n\n` +
                `Para cancelar o reprogramar, responde a este mensaje.`;

              metaClient
                .sendTextMessage(patientPhone, whatsappText)
                .catch((err) => {
                  logger.warn(
                    { err, appointmentId: row.appointmentId },
                    'Reminder job: WhatsApp send failed'
                  );
                });
            }
          }
        } catch (err) {
          logger.error(
            { err, appointmentId: row.appointmentId },
            'Reminder job: error processing appointment'
          );
          totalFailed++;
          // Continue with remaining appointments
        }
      }
    }

    const processingMs = Date.now() - startTime;
    logger.info(
      {
        sent: totalSent,
        failed: totalFailed,
        skipped: totalSkipped,
        processingMs,
      },
      'Reminder job completed'
    );

    // Alert if success rate is low
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { rate } = await getSuccessRate(since);
    if (rate < 95) {
      logger.warn(
        { successRate: rate.toFixed(1) },
        'Reminder job: success rate below 95%'
      );
    }
  } catch (err) {
    logger.error({ err }, 'Reminder job failed');
  }
}
