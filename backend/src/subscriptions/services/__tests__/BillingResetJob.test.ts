/**
 * Unit tests for BillingResetJob
 */

import { db } from '../../utils/db.js';
import { users } from '../../../db/schema.js';
import {
  resetMonthlyUsage,
  isMonthlyResetNeeded,
  runMonthlyBillingReset,
} from '../BillingResetJob.js';
import { eq } from 'drizzle-orm';

describe('BillingResetJob', () => {
  // Helper to get current billing month
  const getCurrentMonth = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Helper to get previous billing month
  const getPreviousMonth = (): string => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Test user IDs for cleanup
  const testUserIds: string[] = [];

  // Helper to create a test user
  const createTestUser = async (
    overrides: Partial<typeof users.$inferInsert> = {}
  ) => {
    const [user] = await db
      .insert(users)
      .values({
        email: `test-${Date.now()}-${Math.random()}@example.com`,
        passwordHash: 'test-hash',
        subscriptionPlan: 'pro',
        subscriptionStatus: 'active',
        ...overrides,
      })
      .returning();

    testUserIds.push(user.id);
    return user;
  };

  // Cleanup test users after each test
  afterEach(async () => {
    if (testUserIds.length > 0) {
      await db.delete(users).where(eq(users.id, testUserIds[0]));
      for (let i = 1; i < testUserIds.length; i++) {
        await db.delete(users).where(eq(users.id, testUserIds[i]));
      }
      testUserIds.length = 0;
    }
  });

  describe('resetMonthlyUsage', () => {
    it('should reset billing month to current month (YYYY-MM format)', async () => {
      const previousMonth = getPreviousMonth();
      const currentMonth = getCurrentMonth();

      // Create users with previous billing month
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      // Run reset
      await resetMonthlyUsage();

      // Verify billing month updated
      const [updatedUser1] = await db
        .select()
        .from(users)
        .where(eq(users.id, user1.id));
      const [updatedUser2] = await db
        .select()
        .from(users)
        .where(eq(users.id, user2.id));

      expect(updatedUser1.billingMonth).toBe(currentMonth);
      expect(updatedUser2.billingMonth).toBe(currentMonth);

      // Verify format is YYYY-MM
      expect(currentMonth).toMatch(/^\d{4}-\d{2}$/);
    });

    it('should return the count of users updated', async () => {
      // Create test users
      await createTestUser();
      await createTestUser();

      // Run reset
      const count = await resetMonthlyUsage();

      // Should update at least our test users (may be more if other users exist)
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should update all users regardless of current billing month', async () => {
      const currentMonth = getCurrentMonth();
      const previousMonth = getPreviousMonth();

      // Create users with different billing months
      const user1 = await createTestUser({
        billingMonth: previousMonth,
      });
      const user2 = await createTestUser({
        billingMonth: currentMonth,
      });

      // Run reset
      await resetMonthlyUsage();

      // Verify both users were reset
      const [updatedUser1] = await db
        .select()
        .from(users)
        .where(eq(users.id, user1.id));
      const [updatedUser2] = await db
        .select()
        .from(users)
        .where(eq(users.id, user2.id));

      expect(updatedUser1.billingMonth).toBe(currentMonth);
      expect(updatedUser2.billingMonth).toBe(currentMonth);
    });
  });

  describe('isMonthlyResetNeeded', () => {
    it('should return true when users have previous billing month', async () => {
      // Create user with previous month
      await createTestUser({
        billingMonth: getPreviousMonth(),
      });

      const needed = await isMonthlyResetNeeded();
      expect(needed).toBe(true);
    });

    it('should return false when all users have current billing month', async () => {
      // Create users with current month
      await createTestUser({
        billingMonth: getCurrentMonth(),
      });
      await createTestUser({
        billingMonth: getCurrentMonth(),
      });

      const needed = await isMonthlyResetNeeded();
      expect(needed).toBe(false);
    });

    it('should return true when users have null billing month', async () => {
      // Create user with null billing month
      await createTestUser({
        billingMonth: null,
      });

      const needed = await isMonthlyResetNeeded();
      expect(needed).toBe(true);
    });
  });

  describe('runMonthlyBillingReset', () => {
    it('should perform reset when needed and return correct status', async () => {
      // Create users needing reset
      await createTestUser({
        billingMonth: getPreviousMonth(),
      });
      await createTestUser({
        billingMonth: getPreviousMonth(),
      });

      const result = await runMonthlyBillingReset();

      expect(result.resetPerformed).toBe(true);
      expect(result.usersUpdated).toBeGreaterThanOrEqual(2);
    });

    it('should skip reset when not needed and return correct status', async () => {
      // Create users already on current month
      await createTestUser({
        billingMonth: getCurrentMonth(),
      });

      const result = await runMonthlyBillingReset();

      expect(result.resetPerformed).toBe(false);
      expect(result.usersUpdated).toBe(0);
    });
  });

  describe('billing month format', () => {
    it('should use YYYY-MM format for billing month', async () => {
      const user = await createTestUser({
        billingMonth: getPreviousMonth(),
      });

      await resetMonthlyUsage();

      const [updatedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id));

      // Verify format
      expect(updatedUser.billingMonth).toMatch(/^\d{4}-\d{2}$/);

      // Verify it's a valid date
      const [year, month] = updatedUser.billingMonth!.split('-');
      expect(parseInt(year)).toBeGreaterThan(2020);
      expect(parseInt(month)).toBeGreaterThanOrEqual(1);
      expect(parseInt(month)).toBeLessThanOrEqual(12);
    });
  });
});
