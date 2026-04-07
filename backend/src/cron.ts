import dotenv from 'dotenv';
import { sendReminders } from './jobs/reminderJob.js';
import logger from './utils/logger.js';
import pool from './db/connect.js';

dotenv.config();

async function runCronJob() {
  try {
    logger.info('Starting Railway cron job: appointment reminders');

    // Execute the reminder job
    await sendReminders();

    logger.info('Cron job completed successfully');

    // Close database connections
    await pool.end();

    // Exit successfully
    process.exit(0);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : 'Unknown',
      },
      'Cron job failed'
    );

    // Close database connections even on error
    try {
      await pool.end();
    } catch (closeError) {
      logger.error({ closeError }, 'Failed to close database connection');
    }

    // Exit with error code
    process.exit(1);
  }
}

// Run the cron job
void runCronJob();
