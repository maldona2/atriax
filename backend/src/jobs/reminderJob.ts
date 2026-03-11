import { and, between, eq, inArray } from 'drizzle-orm';
import { db, appointments, patients, users } from '../db/client.js';
import { sendAppointmentReminder } from '../services/mailService.js';
import logger from '../utils/logger.js';

/**
 * Sends 24-hour reminder emails for all non-cancelled appointments
 * scheduled between now+23h and now+25h that have a patient email.
 */
export async function sendReminders(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  logger.info(
    'Running reminder job for appointments between %s and %s',
    windowStart.toISOString(),
    windowEnd.toISOString()
  );

  try {
    const rows = await db
      .select({
        appointmentId: appointments.id,
        tenantId: appointments.tenantId,
        scheduledAt: appointments.scheduledAt,
        durationMinutes: appointments.durationMinutes,
        patientId: appointments.patientId,
        patientEmail: patients.email,
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
      .select({ tenantId: users.tenantId, fullName: users.fullName })
      .from(users)
      .where(
        and(
          inArray(users.tenantId as typeof users.tenantId, tenantIds),
          eq(users.role, 'professional')
        )
      );

    const profByTenant = new Map(professionals.map((p) => [p.tenantId, p.fullName]));

    for (const row of rows) {
      if (!row.patientEmail) continue;

      sendAppointmentReminder(row.patientEmail, {
        patientName: `${row.patientFirstName} ${row.patientLastName}`,
        professionalName: profByTenant.get(row.tenantId) ?? 'El profesional',
        scheduledAt: row.scheduledAt ?? new Date(),
        durationMinutes: row.durationMinutes ?? 60,
      }, row.appointmentId);
    }

    logger.info('Reminder job: sent reminders for %d appointments', rows.length);
  } catch (err) {
    logger.error({ err }, 'Reminder job failed');
  }
}
