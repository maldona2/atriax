/**
 * Daily Recording Reset Job - Placeholder for future AI recording reset
 *
 * Currently disabled since AI features are not implemented yet.
 * This service will be activated when Gold plan AI features are enabled.
 */

import logger from '../../utils/logger.js';

/**
 * Reset daily recording minutes for all users
 * Currently a no-op since no AI features are active
 */
export async function resetDailyRecordingMinutes(): Promise<number> {
  logger.info('Daily recording minutes reset skipped - no AI features active');
  return 0;
}

/**
 * Check if daily reset is needed for any users
 * Currently always returns false since no AI features are active
 */
export async function isDailyResetNeeded(): Promise<boolean> {
  return false;
}

/**
 * Run the daily recording minutes reset job
 * Currently a no-op since no AI features are active
 */
export async function runDailyRecordingReset(): Promise<{
  resetPerformed: boolean;
  usersUpdated: number;
}> {
  logger.info(
    'Daily recording minutes reset job skipped - no AI features active'
  );
  return { resetPerformed: false, usersUpdated: 0 };
}
