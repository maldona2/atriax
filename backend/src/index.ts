import dotenv from 'dotenv';
import cron from 'node-cron';
import app from './app.js';
import logger from './utils/logger.js';
import { sendReminders } from './jobs/reminderJob.js';
import {
  startCalendarSyncWorker,
  stopCalendarSyncWorker,
} from './workers/calendarSyncWorker.js';
import { initializeSubscriptionSystem } from './subscriptions/init.js';
import { runMonthlyBillingReset } from './subscriptions/services/BillingResetJob.js';
import { runDailyRecordingReset } from './subscriptions/services/DailyRecordingResetJob.js';
import { runCleanupPendingPhotos } from './jobs/cleanupPendingPhotos.js';
import { SessionManager } from './whatsapp/services/SessionManager.js';

dotenv.config();

const PORT = process.env.PORT || 5001;

// Initialize subscription system before starting server
async function startServer() {
  try {
    // Initialize subscription system components
    logger.info('Initializing subscription system...');
    await initializeSubscriptionSystem();
    logger.info('Subscription system initialized successfully');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    // Schedule jobs
    setupScheduledJobs();

    // Start calendar sync worker
    startCalendarSyncWorker();
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : 'Unknown',
      },
      'Failed to start server'
    );
    process.exit(1);
  }
}

/**
 * Set up all scheduled jobs
 */
function setupScheduledJobs() {
  // Send 24h appointment reminders (configurable via env, default: daily at 09:00)
  const reminderCronSchedule =
    process.env.REMINDER_CRON_SCHEDULE ?? '0 9 * * *';
  cron.schedule(reminderCronSchedule, () => {
    logger.info('Cron: running appointment reminder job');
    void sendReminders();
  });

  // Daily at 00:01 — reset daily recording minutes
  cron.schedule('1 0 * * *', () => {
    logger.info('Cron: running daily recording minutes reset job');
    void runDailyRecordingReset()
      .then((result) => {
        logger.info(result, 'Daily recording minutes reset job completed');
      })
      .catch((error) => {
        logger.error({ error }, 'Daily recording minutes reset job failed');
      });
  });

  // Monthly on the 1st at 00:05 — reset monthly billing counters
  cron.schedule('5 0 1 * *', () => {
    logger.info('Cron: running monthly billing reset job');
    void runMonthlyBillingReset()
      .then((result) => {
        logger.info(result, 'Monthly billing reset job completed');
      })
      .catch((error) => {
        logger.error({ error }, 'Monthly billing reset job failed');
      });
  });

  // Every 30 minutes — delete stale pending photos
  runCleanupPendingPhotos();
  setInterval(() => void runCleanupPendingPhotos(), 30 * 60 * 1000);

  // Every 6 hours — clean up expired WhatsApp conversation sessions
  const sessionManager = new SessionManager();
  setInterval(
    () => void sessionManager.cleanupExpiredSessions(),
    6 * 60 * 60 * 1000
  );

  logger.info('Scheduled jobs configured successfully');
}

const shutdown = async () => {
  logger.info('Shutting down...');
  await stopCalendarSyncWorker();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

// Start the server
void startServer();
