import { eq } from 'drizzle-orm';
import { db, users, patientCounts } from '../../db/client.js';
import type { LimitEnforcer } from '../interfaces/LimitEnforcer.js';

const FREE_TIER_PATIENT_LIMIT = 5;
const PRO_TIER_PATIENT_LIMIT = 50;

/** Sentinel for unlimited patient capacity (matches subscriptions SENTINEL_VALUE). */
export const UNLIMITED = -1;

/**
 * Pure mapping from subscription plan name to patient limit.
 * Gold is unlimited (consistent with PlanManager); unknown plans fall back to free.
 */
export function patientLimitForPlan(plan: string): number {
  switch (plan) {
    case 'gold':
      return UNLIMITED;
    case 'pro':
      return PRO_TIER_PATIENT_LIMIT;
    case 'free':
    default:
      return FREE_TIER_PATIENT_LIMIT;
  }
}

/**
 * LimitEnforcementService implements subscription-based limits
 * using the users.subscriptionPlan and patient_counts table.
 */
export class LimitEnforcementService implements LimitEnforcer {
  async canCreatePatient(userId: string): Promise<boolean> {
    const limit = await this.getPatientLimit(userId);
    if (limit === UNLIMITED) return true;

    const [countRow] = await db
      .select()
      .from(patientCounts)
      .where(eq(patientCounts.userId, userId))
      .limit(1);

    const current = countRow?.count ?? 0;
    return current < limit;
  }

  async canAccessCalendar(userId: string): Promise<boolean> {
    const [user] = await db
      .select({
        subscriptionPlan: users.subscriptionPlan,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return false;
    return user.subscriptionPlan !== 'free';
  }

  async getPatientCount(userId: string): Promise<number> {
    const [row] = await db
      .select()
      .from(patientCounts)
      .where(eq(patientCounts.userId, userId))
      .limit(1);

    return row?.count ?? 0;
  }

  async incrementPatientCount(userId: string): Promise<void> {
    const now = new Date();
    const [existing] = await db
      .select()
      .from(patientCounts)
      .where(eq(patientCounts.userId, userId))
      .limit(1);

    if (!existing) {
      await db.insert(patientCounts).values({
        userId,
        count: 1,
        lastUpdated: now,
      });
      return;
    }

    await db
      .update(patientCounts)
      .set({ count: existing.count + 1, lastUpdated: now })
      .where(eq(patientCounts.userId, userId));
  }

  async decrementPatientCount(userId: string): Promise<void> {
    const now = new Date();
    const [existing] = await db
      .select()
      .from(patientCounts)
      .where(eq(patientCounts.userId, userId))
      .limit(1);

    if (!existing) return;

    const next = Math.max(0, existing.count - 1);
    await db
      .update(patientCounts)
      .set({ count: next, lastUpdated: now })
      .where(eq(patientCounts.userId, userId));
  }

  async getPatientLimit(userId: string): Promise<number> {
    const [user] = await db
      .select({
        subscriptionPlan: users.subscriptionPlan,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return FREE_TIER_PATIENT_LIMIT;
    return patientLimitForPlan(user.subscriptionPlan);
  }
}
