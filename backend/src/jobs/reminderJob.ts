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

  if (!appt.patientEmail) return;

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
  try {
    await sendWithRetry(appt.patientEmail, notificationData, appointmentId);
  } catch (err) {
    sendError = err instanceof Error ? err.message : String(err);
  }

  await recordDelivery({
    tenantId,
    appointmentId,
    patientId: appt.patientId,
    patientEmail: appt.patientEmail,
    status: sendError ? 'failed' : 'sent',
    errorMessage: sendError,
    retryCount: sendError ? MAX_RETRIES : 0,
  });

  if (!sendError) {
    const isGold =
      prof?.subscriptionPlan === 'gold' &&
      prof?.subscriptionStatus === 'active';
    if (appt.patientPhone && isGold) {
      try {
        const token = await createCancellationToken(
          appointmentId,
          tenantId,
          48
        );
        const cancelUrl = buildCancelUrl(token);
        await whatsAppNotificationService.sendAppointmentReminder(
          appt.patientPhone,
          { ...notificationData, cancelUrl }
        );
      } catch (err) {
        logger.warn(
          { err, appointmentId },
          'Immediate reminder: WhatsApp send failed'
        );
      }
    }
    logger.info({ appointmentId }, 'Immediate reminder sent');
  } else {
    logger.warn({ appointmentId, sendError }, 'Immediate reminder failed');
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
          // Handle missing email
          if (!row.patientEmail) {
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
              errorMessage: 'no email address',
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

            // Send WhatsApp reminder to patient if they have a phone number
            // and the professional is on Gold plan
            const isGold =
              prof?.subscriptionPlan === 'gold' &&
              prof?.subscriptionStatus === 'active';
            if (row.patientPhone && isGold) {
              try {
                const token = await createCancellationToken(
                  row.appointmentId,
                  row.tenantId,
                  48
                );
                const cancelUrl = buildCancelUrl(token);
                await whatsAppNotificationService.sendAppointmentReminder(
                  row.patientPhone,
                  { ...notificationData, cancelUrl }
                );
              } catch (err) {
                logger.warn(
                  { err, appointmentId: row.appointmentId },
                  'Reminder job: WhatsApp send failed'
                );
              }
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
