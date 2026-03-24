/**
 * UsageTracker - Manages daily appointment usage counters with atomic operations
 */

import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db, dailyAppointmentUsage } from '../../db/client.js';

export interface DailyUsage {
  userId: string;
  date: string; // YYYY-MM-DD format
  count: number;
  lastUpdated: Date | null;
}

function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

export class UsageTracker {
  /**
   * Get current usage count for user today.
   * Returns 0 if no record exists.
   */
  async getCurrentUsage(userId: string): Promise<number> {
    const today = getTodayUTC();
    const [row] = await db
      .select({ count: dailyAppointmentUsage.count })
      .from(dailyAppointmentUsage)
      .where(
        and(
          eq(dailyAppointmentUsage.userId, userId),
          eq(dailyAppointmentUsage.usageDate, today)
        )
      )
      .limit(1);

    return row?.count ?? 0;
  }

  /**
   * Atomically increment usage counter for user today.
   * Creates record if it doesn't exist.
   * Returns new count.
   */
  async incrementUsage(userId: string): Promise<number> {
    const today = getTodayUTC();
    const now = new Date();

    const [row] = await db
      .insert(dailyAppointmentUsage)
      .values({
        userId,
        usageDate: today,
        count: 1,
        lastUpdated: now,
      })
      .onConflictDoUpdate({
        target: [dailyAppointmentUsage.userId, dailyAppointmentUsage.usageDate],
        set: {
          count: sql`${dailyAppointmentUsage.count} + 1`,
          lastUpdated: now,
        },
      })
      .returning({ count: dailyAppointmentUsage.count });

    return row?.count ?? 1;
  }

  /**
   * Get usage record with metadata for user today.
   * Returns null if no record exists.
   */
  async getUsageRecord(userId: string): Promise<DailyUsage | null> {
    const today = getTodayUTC();
    const [row] = await db
      .select()
      .from(dailyAppointmentUsage)
      .where(
        and(
          eq(dailyAppointmentUsage.userId, userId),
          eq(dailyAppointmentUsage.usageDate, today)
        )
      )
      .limit(1);

    if (!row) return null;

    return {
      userId: row.userId,
      date: row.usageDate,
      count: row.count,
      lastUpdated: row.lastUpdated,
    };
  }
}
