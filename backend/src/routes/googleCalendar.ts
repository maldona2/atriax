import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { googleAuthService } from '../services/googleAuthService.js';
import { calendarSyncService } from '../services/calendarSyncService.js';
import { syncQueue } from '../services/syncQueue.js';
import { calendarSyncMonitor } from '../services/calendarSyncMonitor.js';
import logger from '../utils/logger.js';

const router = Router();

// ─── OAuth Routes ─────────────────────────────────────────────────────────────

/**
 * GET /api/auth/google/calendar
 * Initiates Google OAuth flow
 */
router.get(
  '/auth/google/calendar',
  authenticate,
  (req: Request, res: Response) => {
    const userId = req.user!.id;
    const url = googleAuthService.getAuthorizationUrl(userId);
    res.json({ url });
  }
);

/**
 * GET /api/auth/google/calendar/callback
 * Handles OAuth callback from Google
 */
router.get(
  '/auth/google/calendar/callback',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, state, error } = req.query as Record<string, string>;

      if (error) {
        logger.warn({ error }, 'Google OAuth callback returned error');
        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
        return res.redirect(
          `${frontendUrl}/app/profile?calendar_error=${encodeURIComponent(error)}`
        );
      }

      if (!code || !state) {
        return res.status(400).json({ error: 'Missing code or state' });
      }

      let userId: string;
      let tenantId: string | null;

      try {
        const decoded = JSON.parse(
          Buffer.from(state, 'base64url').toString('utf8')
        ) as { userId: string };
        userId = decoded.userId;

        const { db, users } = await import('../db/client.js');
        const { eq } = await import('drizzle-orm');
        const [user] = await db
          .select({ tenantId: users.tenantId })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        tenantId = user?.tenantId ?? null;
      } catch {
        return res.status(400).json({ error: 'Invalid state parameter' });
      }

      if (!tenantId) {
        return res.status(400).json({ error: 'User has no tenant' });
      }

      await googleAuthService.handleCallback(code, userId, tenantId);

      await syncQueue.enqueue({
        tenantId,
        userId,
        operation: 'batch_sync',
        priority: 10,
      });

      logger.info({ userId }, 'Google Calendar connected, batch sync queued');

      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
      res.redirect(`${frontendUrl}/app/profile?calendar_connected=true`);
    } catch (err) {
      next(err);
    }
  }
);

// ─── Calendar Status Routes ───────────────────────────────────────────────────

/**
 * GET /api/calendar/status
 * Returns Google Calendar connection status
 */
router.get(
  '/calendar/status',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const info = await googleAuthService.getConnectionInfo(userId);
      res.json({
        connected: info?.connected ?? false,
        tokenExpiresAt: info?.tokenExpiresAt ?? null,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/calendar/disconnect
 * Disconnects Google Calendar integration
 */
router.delete(
  '/calendar/disconnect',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'User has no tenant' });
      }

      const syncedEventIds = await calendarSyncService.getAllSyncedEventIds(
        tenantId,
        userId
      );

      let deletedCount = 0;
      for (const googleEventId of syncedEventIds) {
        try {
          const { google } = await import('googleapis');
          const { googleCalendarConfig } =
            await import('../config/googleCalendar.js');
          const accessToken = await googleAuthService.getAccessToken(userId);
          const oauth2Client = new google.auth.OAuth2(
            googleCalendarConfig.clientId,
            googleCalendarConfig.clientSecret,
            googleCalendarConfig.redirectUri
          );
          oauth2Client.setCredentials({ access_token: accessToken });
          const calendar = google.calendar({
            version: 'v3',
            auth: oauth2Client,
          });
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: googleEventId,
          });
          deletedCount++;
        } catch (err: unknown) {
          const code =
            typeof err === 'object' && err !== null && 'code' in err
              ? (err as { code: number }).code
              : null;
          if (code !== 404 && code !== 410) {
            logger.warn(
              { googleEventId, err },
              'Failed to delete calendar event during disconnect'
            );
          }
        }
      }

      await calendarSyncService.resetAllSyncStatuses(tenantId);
      await calendarSyncService.clearPendingQueueForUser(userId);
      await googleAuthService.disconnect(userId);

      logger.info(
        { userId, deletedCount },
        'Google Calendar disconnected successfully'
      );

      res.json({
        success: true,
        message: 'Google Calendar disconnected successfully',
        deletedEvents: deletedCount,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Sync Routes ──────────────────────────────────────────────────────────────

/**
 * POST /api/calendar/sync/:appointmentId
 * Manually sync a single appointment
 */
router.post(
  '/calendar/sync/:appointmentId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { appointmentId } = req.params;
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'User has no tenant' });
      }

      const result = await calendarSyncService.syncAppointment(
        appointmentId,
        tenantId,
        userId
      );

      if (result.success) {
        calendarSyncMonitor.recordSuccess();
        res.json({ success: true, googleEventId: result.googleEventId });
      } else {
        calendarSyncMonitor.recordFailure(result.error ?? 'Unknown error');
        res.status(422).json({ success: false, error: result.error });
      }
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/calendar/sync/all
 * Trigger initial/full sync for the authenticated doctor
 */
router.post(
  '/calendar/sync/all',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'User has no tenant' });
      }

      await syncQueue.enqueue({
        tenantId,
        userId,
        operation: 'batch_sync',
        priority: 10,
      });

      res.json({
        success: true,
        message: 'Batch sync job enqueued',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/calendar/sync/:appointmentId/status
 * Get sync status for an appointment
 */
router.get(
  '/calendar/sync/:appointmentId/status',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { appointmentId } = req.params;
      const tenantId = req.user!.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'User has no tenant' });
      }

      const status = await calendarSyncService.getSyncStatus(
        appointmentId,
        tenantId
      );

      if (!status) {
        return res.json({
          status: 'unsynced',
          googleEventId: null,
          lastSyncedAt: null,
          errorMessage: null,
        });
      }

      res.json({
        status: status.status,
        googleEventId: status.googleEventId,
        lastSyncedAt: status.lastSyncedAt,
        errorMessage: status.errorMessage,
        retryCount: status.retryCount,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/calendar/sync/:appointmentId/retry
 * Retry a failed sync
 */
router.post(
  '/calendar/sync/:appointmentId/retry',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { appointmentId } = req.params;
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'User has no tenant' });
      }

      const result = await calendarSyncService.retryFailedSync(
        appointmentId,
        tenantId,
        userId
      );

      if (result.success) {
        calendarSyncMonitor.recordSuccess();
        res.json({ success: true, googleEventId: result.googleEventId });
      } else {
        calendarSyncMonitor.recordFailure(result.error ?? 'Unknown error');
        res.status(422).json({ success: false, error: result.error });
      }
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/calendar/metrics
 * Get sync metrics for the tenant
 */
router.get(
  '/calendar/metrics',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user!.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'User has no tenant' });
      }

      const dbMetrics = await calendarSyncMonitor.getDbMetrics(tenantId);
      const inMemoryMetrics = calendarSyncMonitor.getMetrics();

      res.json({ dbMetrics, inMemoryMetrics });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
