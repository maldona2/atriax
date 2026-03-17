/**
 * Billing Reset Job - Placeholder for future AI billing reset
 *
 * Currently disabled since AI features are not implemented yet.
 * This service will be activated when Gold plan AI features are enabled.
 */

import logger from '../../utils/logger.js';

/**
 * Reset monthly usage counters for all users
 * Currently a no-op since no AI features are active
 */
export async function resetMonthlyUsage(): Promise<number> {
  logger.info('Monthly usage reset skipped - no AI features active');
  return 0;
}

/**
 * Check if monthly reset is needed for any users
 * Currently always returns false since no AI features are active
 */
export async function isMonthlyResetNeeded(): Promise<boolean> {
  return false;
}

/**
 * Run the monthly billing reset job
 * Currently a no-op since no AI features are active
 */
export async function runMonthlyBillingReset(): Promise<{
  resetPerformed: boolean;
  usersUpdated: number;
}> {
  logger.info('Monthly billing reset job skipped - no AI features active');
  return { resetPerformed: false, usersUpdated: 0 };
}
