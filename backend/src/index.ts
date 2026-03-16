import dotenv from 'dotenv';
import cron from 'node-cron';
import app from './app.js';
import logger from './utils/logger.js';
import { sendReminders } from './jobs/reminderJob.js';
import {
  startCalendarSyncWorker,
  stopCalendarSyncWorker,
} from './workers/calendarSyncWorker.js';

dotenv.config();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Daily at 09:00 — send 24h appointment reminders
cron.schedule('0 9 * * *', () => {
  logger.info('Cron: running appointment reminder job');
  void sendReminders();
});

startCalendarSyncWorker();

const shutdown = async () => {
  logger.info('Shutting down...');
  await stopCalendarSyncWorker();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
