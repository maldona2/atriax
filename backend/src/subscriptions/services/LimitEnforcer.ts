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
   * Read-only check of the user's current daily appointment limit status.
   * Used for UI display via getDailyAppointmentStatus.
   *
   * Fails closed: if the usage counter cannot be retrieved, creation is denied
   * rather than allowed, so a database outage cannot be used to bypass limits.
   */
  async checkDailyAppointmentLimit(userId: string): Promise<LimitCheckResult> {
    const resetTime = getNextMidnightUTC();
    const planName = await this.getUserPlanName(userId);
    const limit = this.planManager.getDailyAppointmentLimit(planName);

    // Unlimited users bypass limit checks
    if (limit === SENTINEL_VALUE || limit < 0) {
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
        'Failed to retrieve usage counter, denying creation (fail-closed)'
      );
      return {
        allowed: false,
        limit,
        currentUsage: 0,
        remaining: 0,
        resetTime,
        reason: 'service_unavailable',
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
   * Atomically reserve one daily appointment slot for the user.
   *
   * Combines the limit check and the usage increment into a single atomic
   * database operation, eliminating the check-then-increment race where
   * concurrent requests could each pass the check before any of them
   * incremented the counter. Call this BEFORE persisting the appointment, and
   * call releaseDailyAppointment if the persist subsequently fails.
   *
   * Fails closed: if the counter cannot be updated, creation is denied.
   */
  async reserveDailyAppointment(userId: string): Promise<LimitCheckResult> {
    const resetTime = getNextMidnightUTC();
    const planName = await this.getUserPlanName(userId);
    const limit = this.planManager.getDailyAppointmentLimit(planName);

    // Unlimited users bypass limit checks (best-effort usage tracking only).
    if (limit === SENTINEL_VALUE || limit < 0) {
      try {
        await this.usageTracker.incrementUsage(userId);
      } catch (err) {
        logger.warn(
          { userId, error: err },
          'Failed to track usage for unlimited plan (non-fatal)'
        );
      }
      return {
        allowed: true,
        limit: SENTINEL_VALUE,
        currentUsage: 0,
        remaining: SENTINEL_VALUE,
        resetTime,
      };
    }

    try {
      const { consumed, count } = await this.usageTracker.tryConsume(
        userId,
        limit
      );

      if (!consumed) {
        return {
          allowed: false,
          limit,
          currentUsage: count,
          remaining: 0,
          resetTime,
          reason: `Daily appointment limit of ${limit} exceeded`,
        };
      }

      return {
        allowed: true,
        limit,
        currentUsage: count,
        remaining: Math.max(0, limit - count),
        resetTime,
      };
    } catch (err) {
      logger.error(
        { userId, error: err },
        'Failed to reserve appointment slot, denying creation (fail-closed)'
      );
      return {
        allowed: false,
        limit,
        currentUsage: 0,
        remaining: 0,
        resetTime,
        reason: 'service_unavailable',
      };
    }
  }

  /**
   * Release a previously reserved slot. Call this when appointment creation
   * fails after reserveDailyAppointment succeeded, to avoid leaking a count.
   */
  async releaseDailyAppointment(userId: string): Promise<void> {
    await this.usageTracker.decrementUsage(userId);
  }

  /**
   * Get current limit status for user (for UI display).
   * Read-only; does not consume a slot.
   */
  async getDailyAppointmentStatus(userId: string): Promise<LimitCheckResult> {
    return this.checkDailyAppointmentLimit(userId);
  }
}
