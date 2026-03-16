import { google } from 'googleapis';
import { and, eq } from 'drizzle-orm';
import {
  db,
  appointments,
  patients,
  calendarSyncStatus,
  calendarSyncQueue,
} from '../db/client.js';
import { googleAuthService } from './googleAuthService.js';
import { eventFormatter } from './eventFormatter.js';
import { googleCalendarRateLimiter } from './rateLimiter.js';
import { googleCalendarConfig } from '../config/googleCalendar.js';
import logger from '../utils/logger.js';

export interface SyncResult {
  success: boolean;
  googleEventId?: string;
  error?: string;
}

export interface BatchSyncResult {
  total: number;
  synced: number;
  failed: number;
  skipped: number;
}

export class CalendarSyncService {
  private async getCalendarClient(userId: string) {
    const accessToken = await googleAuthService.getAccessToken(userId);
    const oauth2Client = new google.auth.OAuth2(
      googleCalendarConfig.clientId,
      googleCalendarConfig.clientSecret,
      googleCalendarConfig.redirectUri
    );
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  private async getOrCreateSyncStatus(
    appointmentId: string,
    tenantId: string,
    userId: string
  ) {
    const [existing] = await db
      .select()
      .from(calendarSyncStatus)
      .where(eq(calendarSyncStatus.appointmentId, appointmentId))
      .limit(1);

    if (existing) return existing;

    const [created] = await db
      .insert(calendarSyncStatus)
      .values({
        appointmentId,
        tenantId,
        userId,
        status: 'unsynced',
        retryCount: 0,
      })
      .returning();

    return created!;
  }

  async syncAppointment(
    appointmentId: string,
    tenantId: string,
    userId: string
  ): Promise<SyncResult> {
    logger.info(
      { appointmentId, userId },
      'Syncing appointment to Google Calendar'
    );

    const [apptRow] = await db
      .select({
        id: appointments.id,
        status: appointments.status,
        scheduledAt: appointments.scheduledAt,
        durationMinutes: appointments.durationMinutes,
        notes: appointments.notes,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientPhone: patients.phone,
        patientEmail: patients.email,
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!apptRow) {
      return { success: false, error: 'Appointment not found' };
    }

    if (apptRow.status !== 'confirmed') {
      logger.info(
        { appointmentId, status: apptRow.status },
        'Skipping non-confirmed appointment'
      );
      return { success: false, error: 'Appointment is not confirmed' };
    }

    const syncStatusRow = await this.getOrCreateSyncStatus(
      appointmentId,
      tenantId,
      userId
    );

    try {
      await googleCalendarRateLimiter.waitForCapacity();
      googleCalendarRateLimiter.recordCall();

      const calendar = await this.getCalendarClient(userId);
      const apptData = {
        id: apptRow.id,
        scheduledAt: apptRow.scheduledAt,
        durationMinutes: apptRow.durationMinutes ?? 60,
        notes: apptRow.notes,
        patientFirstName: apptRow.patientFirstName,
        patientLastName: apptRow.patientLastName,
        patientPhone: apptRow.patientPhone,
        patientEmail: apptRow.patientEmail,
      };

      let googleEventId: string;

      if (syncStatusRow.googleEventId) {
        const eventUpdate = eventFormatter.formatEventUpdate(apptData);
        const response = await calendar.events.patch({
          calendarId: 'primary',
          eventId: syncStatusRow.googleEventId,
          requestBody: eventUpdate,
        });
        googleEventId = response.data.id!;
        logger.info({ appointmentId, googleEventId }, 'Calendar event updated');
      } else {
        const event = eventFormatter.formatEvent(apptData);
        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
        });
        googleEventId = response.data.id!;
        logger.info({ appointmentId, googleEventId }, 'Calendar event created');
      }

      await db
        .update(calendarSyncStatus)
        .set({
          googleEventId,
          status: 'synced',
          lastSyncedAt: new Date(),
          errorMessage: null,
          retryCount: 0,
          updatedAt: new Date(),
        })
        .where(eq(calendarSyncStatus.appointmentId, appointmentId));

      return { success: true, googleEventId };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      logger.error(
        { appointmentId, userId, err },
        'Failed to sync appointment'
      );

      await db
        .update(calendarSyncStatus)
        .set({
          status: 'failed',
          errorMessage,
          retryCount: (syncStatusRow.retryCount ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(calendarSyncStatus.appointmentId, appointmentId));

      return { success: false, error: errorMessage };
    }
  }

  async deleteCalendarEvent(
    appointmentId: string,
    tenantId: string,
    userId: string
  ): Promise<SyncResult> {
    logger.info(
      { appointmentId, userId },
      'Deleting calendar event for appointment'
    );

    const [syncStatusRow] = await db
      .select()
      .from(calendarSyncStatus)
      .where(eq(calendarSyncStatus.appointmentId, appointmentId))
      .limit(1);

    if (!syncStatusRow?.googleEventId) {
      await db
        .update(calendarSyncStatus)
        .set({ status: 'unsynced', updatedAt: new Date() })
        .where(eq(calendarSyncStatus.appointmentId, appointmentId));
      return { success: true };
    }

    try {
      await googleCalendarRateLimiter.waitForCapacity();
      googleCalendarRateLimiter.recordCall();

      const calendar = await this.getCalendarClient(userId);

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: syncStatusRow.googleEventId,
      });

      logger.info(
        { appointmentId, googleEventId: syncStatusRow.googleEventId },
        'Calendar event deleted'
      );
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'code' in err
          ? (err as { code: number }).code
          : null;

      if (status === 404 || status === 410) {
        logger.info(
          { appointmentId, googleEventId: syncStatusRow.googleEventId },
          'Calendar event already deleted (404/410), treating as success'
        );
      } else {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        logger.error(
          { appointmentId, userId, err },
          'Failed to delete calendar event'
        );
        return { success: false, error: errorMessage };
      }
    }

    await db
      .update(calendarSyncStatus)
      .set({
        status: 'unsynced',
        googleEventId: null,
        updatedAt: new Date(),
      })
      .where(eq(calendarSyncStatus.appointmentId, appointmentId));

    return { success: true };
  }

  async syncAllAppointments(
    tenantId: string,
    userId: string
  ): Promise<BatchSyncResult> {
    logger.info(
      { tenantId, userId },
      'Starting batch sync of all appointments'
    );

    const confirmedAppointments = await db
      .select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        durationMinutes: appointments.durationMinutes,
        notes: appointments.notes,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientPhone: patients.phone,
        patientEmail: patients.email,
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          eq(appointments.status, 'confirmed')
        )
      );

    const result: BatchSyncResult = {
      total: confirmedAppointments.length,
      synced: 0,
      failed: 0,
      skipped: 0,
    };

    const { batchSize } = googleCalendarConfig.sync;

    for (let i = 0; i < confirmedAppointments.length; i += batchSize) {
      const batch = confirmedAppointments.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (appt) => {
          const syncResult = await this.syncAppointment(
            appt.id,
            tenantId,
            userId
          );
          if (syncResult.success) {
            result.synced++;
          } else {
            result.failed++;
          }
        })
      );

      logger.info(
        {
          processed: Math.min(i + batchSize, confirmedAppointments.length),
          total: confirmedAppointments.length,
        },
        'Batch sync progress'
      );
    }

    logger.info(result, 'Batch sync completed');
    return result;
  }

  async getSyncStatus(
    appointmentId: string,
    tenantId: string
  ): Promise<typeof calendarSyncStatus.$inferSelect | null> {
    const [row] = await db
      .select()
      .from(calendarSyncStatus)
      .where(
        and(
          eq(calendarSyncStatus.appointmentId, appointmentId),
          eq(calendarSyncStatus.tenantId, tenantId)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async retryFailedSync(
    appointmentId: string,
    tenantId: string,
    userId: string
  ): Promise<SyncResult> {
    logger.info({ appointmentId }, 'Retrying failed sync');

    await db
      .update(calendarSyncStatus)
      .set({ status: 'pending', updatedAt: new Date() })
      .where(eq(calendarSyncStatus.appointmentId, appointmentId));

    return this.syncAppointment(appointmentId, tenantId, userId);
  }

  async resetAllSyncStatuses(tenantId: string): Promise<void> {
    await db
      .update(calendarSyncStatus)
      .set({
        status: 'unsynced',
        googleEventId: null,
        lastSyncedAt: null,
        errorMessage: null,
        retryCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(calendarSyncStatus.tenantId, tenantId));

    logger.info({ tenantId }, 'All sync statuses reset to unsynced');
  }

  async getAllSyncedEventIds(
    tenantId: string,
    userId: string
  ): Promise<string[]> {
    const rows = await db
      .select({ googleEventId: calendarSyncStatus.googleEventId })
      .from(calendarSyncStatus)
      .where(
        and(
          eq(calendarSyncStatus.tenantId, tenantId),
          eq(calendarSyncStatus.userId, userId),
          eq(calendarSyncStatus.status, 'synced')
        )
      );

    return rows
      .map((r) => r.googleEventId)
      .filter((id): id is string => id !== null);
  }

  async clearPendingQueueForUser(userId: string): Promise<void> {
    await db
      .update(calendarSyncQueue)
      .set({
        status: 'failed',
        errorMessage: 'Disconnected',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(calendarSyncQueue.userId, userId),
          eq(calendarSyncQueue.status, 'pending')
        )
      );
  }
}

export const calendarSyncService = new CalendarSyncService();
