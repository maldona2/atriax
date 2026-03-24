/**
 * LimitEnforcer - Orchestrates daily appointment limit checking and enforcement
 */

import { eq } from 'drizzle-orm';
import { db, users } from '../../db/client.js';
import { LimitCheckResult, SENTINEL_VALUE } from '../models/types.js';
import { PlanManager } from './PlanManager.js';
import { UsageTracker } from './UsageTracker.js';
import logger from '../../utils/logger.js';

function getNextMidnightUTC(): Date {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return tomorrow;
}

export class LimitEnforcer {
  constructor(
    private planManager: PlanManager,
    private usageTracker: UsageTracker
  ) {}

  private async getUserPlanName(userId: string): Promise<string> {
    try {
      const [user] = await db
        .select({ subscriptionPlan: users.subscriptionPlan })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        logger.warn({ userId }, 'User not found, applying free plan limits');
        return 'free';
      }

      return user.subscriptionPlan;
    } catch (err) {
      logger.warn(
        { userId, error: err },
        'Failed to lookup user plan, applying free plan limits'
      );
      return 'free';
    }
  }

  /**
   * Check if user can create an appointment today.
   * Returns detailed status including remaining count.
   * Fails open: if usage counter cannot be retrieved, allows creation.
   */
  async checkDailyAppointmentLimit(userId: string): Promise<LimitCheckResult> {
    const resetTime = getNextMidnightUTC();
    const planName = await this.getUserPlanName(userId);
    const limit = this.planManager.getDailyAppointmentLimit(planName);

    // Handle invalid limit values as unlimited (fail-open)
    if (limit < SENTINEL_VALUE || (limit < 0 && limit !== SENTINEL_VALUE)) {
      return {
        allowed: true,
        limit: SENTINEL_VALUE,
        currentUsage: 0,
        remaining: SENTINEL_VALUE,
        resetTime,
      };
    }

    // Unlimited users bypass limit checks
    if (limit === SENTINEL_VALUE) {
      return {
        allowed: true,
        limit: SENTINEL_VALUE,
        currentUsage: 0,
        remaining: SENTINEL_VALUE,
        resetTime,
      };
    }

    let currentUsage = 0;
    try {
      currentUsage = await this.usageTracker.getCurrentUsage(userId);
    } catch (err) {
      logger.error(
        { userId, error: err },
        'Failed to retrieve usage counter, allowing creation (fail-open)'
      );
      return {
        allowed: true,
        limit,
        currentUsage: 0,
        remaining: limit,
        resetTime,
      };
    }

    const remaining = Math.max(0, limit - currentUsage);
    const allowed = currentUsage < limit;

    return {
      allowed,
      limit,
      currentUsage,
      remaining,
      resetTime,
      reason: allowed
        ? undefined
        : `Daily appointment limit of ${limit} exceeded`,
    };
  }

  /**
   * Increment usage counter after successful appointment creation.
   * Should be called after appointment is persisted.
   */
  async incrementDailyAppointmentUsage(userId: string): Promise<void> {
    await this.usageTracker.incrementUsage(userId);
  }

  /**
   * Get current limit status for user (for UI display).
   * Same as checkDailyAppointmentLimit but semantically for status queries.
   */
  async getDailyAppointmentStatus(userId: string): Promise<LimitCheckResult> {
    return this.checkDailyAppointmentLimit(userId);
  }
}
