import { and, between, eq, inArray } from 'drizzle-orm';
import { db, appointments, patients, users } from '../db/client.js';
import { sendAppointmentReminder } from '../services/mailService.js';
import {
  hasReminderBeenSent,
  checkOptOut,
  recordDelivery,
  getSuccessRate,
} from '../services/reminderService.js';
import { whatsAppNotificationService } from '../whatsapp/services/WhatsAppNotificationService.js';
import {
  createCancellationToken,
  buildCancelUrl,
} from '../services/cancellationTokenService.js';
import logger from '../utils/logger.js';

const IMMEDIATE_REMINDER_MIN_HOURS = 1;
const IMMEDIATE_REMINDER_MAX_HOURS = 36;

/**
 * Sends a reminder immediately if the appointment is within the next 36 hours
 * and a reminder hasn't been sent yet. Handles same-day and next-day appointments
 * created after the daily cron already ran.
 */
export async function maybeSendImmediateReminder(
  tenantId: string,
  appointmentId: string
): Promise<void> {
  const now = new Date();
  const minMs = IMMEDIATE_REMINDER_MIN_HOURS * 60 * 60 * 1000;
  const maxMs = IMMEDIATE_REMINDER_MAX_HOURS * 60 * 60 * 1000;
  const windowStart = new Date(now.getTime() + minMs);
  const windowEnd = new Date(now.getTime() + maxMs);

  const [appt] = await db
    .select({
      appointmentId: appointments.id,
      tenantId: appointments.tenantId,
      scheduledAt: appointments.scheduledAt,
      durationMinutes: appointments.durationMinutes,
      patientId: appointments.patientId,
      status: appointments.status,
      patientEmail: patients.email,
      patientPhone: patients.phone,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.tenantId, tenantId),
        inArray(appointments.status, ['pending', 'confirmed']),
        between(appointments.scheduledAt, windowStart, windowEnd)
      )
    )
    .limit(1);

  if (!appt) return;

  if (!appt.patientEmail && !appt.patientPhone) return;

  const alreadySent = await hasReminderBeenSent(appointmentId);
  if (alreadySent) return;

  const optedOut = await checkOptOut(tenantId, appt.patientId);
  if (optedOut) return;

  const [prof] = await db
    .select({
      fullName: users.fullName,
      address: users.address,
      subscriptionPlan: users.subscriptionPlan,
      subscriptionStatus: users.subscriptionStatus,
    })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, 'professional')))
    .limit(1);

  const notificationData = {
    patientName: `${appt.patientFirstName} ${appt.patientLastName}`,
    professionalName: prof?.fullName ?? 'El profesional',
    scheduledAt: appt.scheduledAt ?? new Date(),
    durationMinutes: appt.durationMinutes ?? 60,
    address: prof?.address ?? null,
  };

  let sendError: string | null = null;
  if (appt.patientEmail) {
    try {
      await sendWithRetry(appt.patientEmail, notificationData, appointmentId);
    } catch (err) {
      sendError = err instanceof Error ? err.message : String(err);
    }
  } else {
    sendError = NO_EMAIL_ERROR;
  }

  const isGold =
    prof?.subscriptionPlan === 'gold' && prof?.subscriptionStatus === 'active';
  const whatsAppSent = await sendWhatsAppReminder(
    appt.patientPhone,
    isGold,
    appointmentId,
    tenantId,
    notificationData
  );

  const delivered = !sendError || whatsAppSent;
  await recordDelivery({
    tenantId,
    appointmentId,
    patientId: appt.patientId,
    patientEmail: appt.patientEmail ?? '',
    status: delivered ? 'sent' : deliveryFailureStatus(sendError),
    errorMessage: delivered ? null : sendError,
    retryCount: sendError && sendError !== NO_EMAIL_ERROR ? MAX_RETRIES : 0,
  });

  if (delivered) {
    logger.info({ appointmentId, whatsAppSent }, 'Immediate reminder sent');
  } else {
    logger.warn({ appointmentId, sendError }, 'Immediate reminder failed');
  }
}

const NO_EMAIL_ERROR = 'no email address';

function deliveryFailureStatus(sendError: string | null): 'failed' | 'skipped' {
  return sendError === NO_EMAIL_ERROR ? 'skipped' : 'failed';
}

/**
 * Sends the WhatsApp reminder. Independent of the email channel: patients with
 * no email address (or whose email bounced) must still get their reminder.
 * Returns true only when Meta accepted the message.
 */
async function sendWhatsAppReminder(
  patientPhone: string | null,
  isGold: boolean,
  appointmentId: string,
  tenantId: string,
  notificationData: Omit<
    Parameters<typeof whatsAppNotificationService.sendAppointmentReminder>[1],
    'cancelUrl'
  >
): Promise<boolean> {
  if (!patientPhone || !isGold) return false;
  try {
    const token = await createCancellationToken(appointmentId, tenantId, 48);
    const cancelUrl = buildCancelUrl(token);
    return await whatsAppNotificationService.sendAppointmentReminder(
      patientPhone,
      { ...notificationData, cancelUrl }
    );
  } catch (err) {
    logger.warn({ err, appointmentId }, 'Reminder: WhatsApp send failed');
    return false;
  }
}

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
      await sendAppointmentReminder(patientEmail, data, appointmentId);
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
  // Send reminders for all appointments on the next calendar day (UTC).
  // Using a date-based window ensures every appointment scheduled tomorrow
  // receives a reminder regardless of what time the cron runs today, and
  // the hasReminderBeenSent check prevents duplicates when the job runs hourly.
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const windowStart = new Date(
    Date.UTC(
      tomorrow.getUTCFullYear(),
      tomorrow.getUTCMonth(),
      tomorrow.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
  const windowEnd = new Date(
    Date.UTC(
      tomorrow.getUTCFullYear(),
      tomorrow.getUTCMonth(),
      tomorrow.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );

  logger.info(
    'Running reminder job for appointments between %s and %s',
    windowStart.toISOString(),
    windowEnd.toISOString()
  );

  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let skippedNoEmail = 0;
  let skippedAlreadySent = 0;
  let skippedOptedOut = 0;

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
        address: users.address,
        subscriptionPlan: users.subscriptionPlan,
        subscriptionStatus: users.subscriptionStatus,
      })
      .from(users)
      .where(
        and(
          inArray(users.tenantId as typeof users.tenantId, tenantIds),
          eq(users.role, 'professional')
        )
      );

    const profByTenant = new Map(professionals.map((p) => [p.tenantId, p]));

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      for (const row of batch) {
        try {
          // No contact channel at all — nothing to send
          if (!row.patientEmail && !row.patientPhone) {
            logger.info(
              { appointmentId: row.appointmentId },
              'Reminder job: skipping — no patient email'
            );
            await recordDelivery({
              tenantId: row.tenantId,
              appointmentId: row.appointmentId,
              patientId: row.patientId,
              patientEmail: '',
              status: 'skipped',
              errorMessage: NO_EMAIL_ERROR,
            });
            skippedNoEmail++;
            totalSkipped++;
            continue;
          }

          // Skip if already sent
          const alreadySent = await hasReminderBeenSent(row.appointmentId);
          if (alreadySent) {
            logger.info(
              { appointmentId: row.appointmentId },
              'Reminder job: skipping — reminder already sent'
            );
            skippedAlreadySent++;
            totalSkipped++;
            continue;
          }

          // Skip opted-out patients
          const optedOut = await checkOptOut(row.tenantId, row.patientId);
          if (optedOut) {
            logger.info(
              { appointmentId: row.appointmentId },
              'Reminder job: skipping — patient opted out'
            );
            skippedOptedOut++;
            totalSkipped++;
            continue;
          }

          const prof = profByTenant.get(row.tenantId);
          const professionalName = prof?.fullName ?? 'El profesional';
          const notificationData = {
            patientName: `${row.patientFirstName} ${row.patientLastName}`,
            professionalName,
            scheduledAt: row.scheduledAt ?? new Date(),
            durationMinutes: row.durationMinutes ?? 60,
            address: prof?.address ?? null,
          };

          let retryCount = 0;
          let sendError: string | null = null;

          if (row.patientEmail) {
            try {
              await sendWithRetry(
                row.patientEmail,
                notificationData,
                row.appointmentId
              );
            } catch (err) {
              retryCount = MAX_RETRIES;
              sendError = err instanceof Error ? err.message : String(err);
            }
          } else {
            sendError = NO_EMAIL_ERROR;
          }

          // WhatsApp goes out regardless of the email result (Gold plan only)
          const isGold =
            prof?.subscriptionPlan === 'gold' &&
            prof?.subscriptionStatus === 'active';
          const whatsAppSent = await sendWhatsAppReminder(
            row.patientPhone,
            isGold,
            row.appointmentId,
            row.tenantId,
            notificationData
          );

          const delivered = !sendError || whatsAppSent;
          await recordDelivery({
            tenantId: row.tenantId,
            appointmentId: row.appointmentId,
            patientId: row.patientId,
            patientEmail: row.patientEmail ?? '',
            status: delivered ? 'sent' : deliveryFailureStatus(sendError),
            errorMessage: delivered ? null : sendError,
            retryCount,
          });

          if (delivered) {
            totalSent++;
          } else if (sendError === NO_EMAIL_ERROR) {
            skippedNoEmail++;
            totalSkipped++;
          } else {
            totalFailed++;
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
        skippedReasons: {
          noEmail: skippedNoEmail,
          alreadySent: skippedAlreadySent,
          optedOut: skippedOptedOut,
        },
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
