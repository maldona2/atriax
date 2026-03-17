/**
 * Integration tests for cost accumulation and enforcement
 *
 * Tests Requirements: 9.5, 9.6, 9.7
 *
 * This test suite demonstrates the complete flow of:
 * 1. Calculating actual cost after each OpenAI API call completes (9.5)
 * 2. Adding cost to user's monthly cost total in users table (9.6)
 * 3. Rejecting subsequent calls when limit exceeded (9.7)
 */

import { CostCalculator } from '../CostCalculator.js';
import { TokenTracker } from '../TokenTracker.js';
import { UsageEnforcer } from '../UsageEnforcer.js';
import { db, users } from '../../../db/client.js';
import { eq } from 'drizzle-orm';
import { SENTINEL_VALUE } from '../../models/types.js';

describe('Cost Accumulation and Enforcement Integration', () => {
  let costCalculator: CostCalculator;
  let tokenTracker: TokenTracker;
  let usageEnforcer: UsageEnforcer;
  let testUserId: string;

  beforeEach(async () => {
    // Initialize components
    costCalculator = new CostCalculator();
    await costCalculator.loadPricingFromDatabase();

    tokenTracker = new TokenTracker();
    tokenTracker.setCostCalculator(costCalculator);

    usageEnforcer = new UsageEnforcer();

    // Create a test user with cost limit
    const [user] = await db
      .insert(users)
      .values({
        email: `test-cost-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        subscriptionPlan: 'pro',
        subscriptionStatus: 'active',
        tokensLimitMonthly: 1000000,
        costLimitMonthlyUsd: '10.0000', // $10 monthly limit
        tokensUsedMonthly: 0,
        costUsedMonthlyUsd: '0',
        billingMonth: null,
      })
      .returning();

    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up test user
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('Requirement 9.5: Calculate actual cost after API call', () => {
    it('should calculate cost using CostCalculator after API call completes', async () => {
      // Simulate an OpenAI API call completing
      const model = 'gpt-4';
      const inputTokens = 1000;
      const outputTokens = 500;

      // Calculate cost (Requirement 9.5)
      const costCalculation = costCalculator.calculateCost(
        model,
        inputTokens,
        outputTokens
      );

      // Verify cost was calculated
      expect(costCalculation.totalCost).toBeGreaterThan(0);
      expect(costCalculation.inputCost).toBe(0.03); // 1000 * $0.03/1000
      expect(costCalculation.outputCost).toBe(0.03); // 500 * $0.06/1000
      expect(costCalculation.totalCost).toBe(0.06);
    });

    it('should calculate cost for different models', async () => {
      // Test gpt-3.5-turbo
      const cost35 = costCalculator.calculateCost('gpt-3.5-turbo', 2000, 1000);
      expect(cost35.totalCost).toBe(0.0025);

      // Test gpt-4-turbo
      const cost4turbo = costCalculator.calculateCost(
        'gpt-4-turbo',
        5000,
        2000
      );
      expect(cost4turbo.totalCost).toBe(0.11);
    });
  });

  describe('Requirement 9.6: Add cost to monthly total', () => {
    it('should add calculated cost to user monthly total', async () => {
      // Simulate API call and record usage
      await tokenTracker.recordTokenUsageWithCost(
        testUserId,
        'gpt-4',
        1000,
        500
      );

      // Verify cost was added to monthly total
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(parseFloat(user.costUsedMonthlyUsd)).toBe(0.06);
      expect(user.tokensUsedMonthly).toBe(1500);
    });

    it('should accumulate costs across multiple API calls', async () => {
      // First API call: gpt-4 with 1000 input, 500 output = $0.06
      await tokenTracker.recordTokenUsageWithCost(
        testUserId,
        'gpt-4',
        1000,
        500
      );

      // Second API call: gpt-3.5-turbo with 2000 input, 1000 output = $0.0025
      await tokenTracker.recordTokenUsageWithCost(
        testUserId,
        'gpt-3.5-turbo',
        2000,
        1000
      );

      // Third API call: gpt-4-turbo with 5000 input, 2000 output = $0.11
      await tokenTracker.recordTokenUsageWithCost(
        testUserId,
        'gpt-4-turbo',
        5000,
        2000
      );

      // Verify total cost accumulated
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      const expectedTotal = 0.06 + 0.0025 + 0.11;
      expect(parseFloat(user.costUsedMonthlyUsd)).toBeCloseTo(expectedTotal, 4);
      expect(user.tokensUsedMonthly).toBe(1500 + 3000 + 7000);
    });

    it('should maintain high precision for cost accumulation', async () => {
      // Make multiple small API calls
      for (let i = 0; i < 10; i++) {
        await tokenTracker.recordTokenUsageWithCost(
          testUserId,
          'gpt-3.5-turbo',
          100,
          50
        );
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      // Each call costs: (100/1000 * 0.0005) + (50/1000 * 0.0015) = 0.000125
      // 10 calls = 0.00125
      // Using precision of 4 to account for rounding in database storage
      expect(parseFloat(user.costUsedMonthlyUsd)).toBeCloseTo(0.00125, 4);
    });

    it('should use incrementTokenUsage for direct cost recording', async () => {
      // Alternative method: calculate cost separately and record
      const costCalculation = costCalculator.calculateCost('gpt-4', 1000, 500);

      await usageEnforcer.incrementTokenUsage(
        testUserId,
        1500,
        costCalculation.totalCost
      );

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(parseFloat(user.costUsedMonthlyUsd)).toBe(0.06);
      expect(user.tokensUsedMonthly).toBe(1500);
    });
  });

  describe('Requirement 9.7: Reject calls when limit exceeded', () => {
    it('should reject API call when cost limit would be exceeded', async () => {
      // Set user close to limit
      const currentMonth = new Date().toISOString().slice(0, 7);
      await db
        .update(users)
        .set({
          costUsedMonthlyUsd: '9.95', // $9.95 used out of $10 limit
          billingMonth: currentMonth,
        })
        .where(eq(users.id, testUserId));

      // Try to make an API call that would cost $0.06
      const estimatedCost = 0.06;
      const check = await usageEnforcer.checkCostLimit(
        testUserId,
        estimatedCost
      );

      // Should be rejected because 9.95 + 0.06 = 10.01 > 10.00
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Monthly cost limit exceeded');
      expect(check.remaining).toBeCloseTo(0.05, 2);
    });

    it('should allow API call when within cost limit', async () => {
      // Set user with some usage
      const currentMonth = new Date().toISOString().slice(0, 7);
      await db
        .update(users)
        .set({
          costUsedMonthlyUsd: '5.00', // $5 used out of $10 limit
          billingMonth: currentMonth,
        })
        .where(eq(users.id, testUserId));

      // Try to make an API call that would cost $0.06
      const estimatedCost = 0.06;
      const check = await usageEnforcer.checkCostLimit(
        testUserId,
        estimatedCost
      );

      // Should be allowed because 5.00 + 0.06 = 5.06 < 10.00
      expect(check.allowed).toBe(true);
      expect(check.remaining).toBeCloseTo(5.0, 2);
    });

    it('should reject subsequent calls after limit is reached', async () => {
      // Make API calls until limit is reached
      const currentMonth = new Date().toISOString().slice(0, 7);
      await db
        .update(users)
        .set({
          costUsedMonthlyUsd: '9.90',
          billingMonth: currentMonth,
        })
        .where(eq(users.id, testUserId));

      // First call: should be allowed (9.90 + 0.06 = 9.96 < 10.00)
      let check = await usageEnforcer.checkCostLimit(testUserId, 0.06);
      expect(check.allowed).toBe(true);

      // Record the usage
      await usageEnforcer.incrementTokenUsage(testUserId, 1500, 0.06);

      // Second call: should be rejected (9.96 + 0.06 = 10.02 > 10.00)
      check = await usageEnforcer.checkCostLimit(testUserId, 0.06);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Monthly cost limit exceeded');
    });

    it('should allow calls at exact limit boundary', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      await db
        .update(users)
        .set({
          costUsedMonthlyUsd: '9.94',
          billingMonth: currentMonth,
        })
        .where(eq(users.id, testUserId));

      // Exactly at limit: 9.94 + 0.06 = 10.00
      const check = await usageEnforcer.checkCostLimit(testUserId, 0.06);
      expect(check.allowed).toBe(true);
      expect(check.remaining).toBeCloseTo(0.06, 2);
    });

    it('should bypass limit check for unlimited users (sentinel value)', async () => {
      // Set unlimited cost limit
      await db
        .update(users)
        .set({
          costLimitMonthlyUsd: '-1', // Sentinel value for unlimited
          costUsedMonthlyUsd: '1000.00', // Already used $1000
        })
        .where(eq(users.id, testUserId));

      // Should allow any cost
      const check = await usageEnforcer.checkCostLimit(testUserId, 500.0);
      expect(check.allowed).toBe(true);
      expect(check.reason).toBe('Unlimited cost usage');
    });
  });

  describe('Complete workflow: Check → Record → Enforce', () => {
    it('should demonstrate complete cost accumulation and enforcement flow', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Scenario: User has $10 limit, starts with $0 used

      // API Call 1: gpt-4 (1000 input, 500 output) = $0.06
      let costCheck = await usageEnforcer.checkCostLimit(testUserId, 0.06);
      expect(costCheck.allowed).toBe(true);

      await tokenTracker.recordTokenUsageWithCost(
        testUserId,
        'gpt-4',
        1000,
        500
      );

      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);
      expect(parseFloat(user.costUsedMonthlyUsd)).toBeCloseTo(0.06, 4);

      // API Call 2: gpt-4 (10000 input, 5000 output) = $0.60
      costCheck = await usageEnforcer.checkCostLimit(testUserId, 0.6);
      expect(costCheck.allowed).toBe(true);

      await tokenTracker.recordTokenUsageWithCost(
        testUserId,
        'gpt-4',
        10000,
        5000
      );

      user = (
        await db.select().from(users).where(eq(users.id, testUserId)).limit(1)
      )[0];
      expect(parseFloat(user.costUsedMonthlyUsd)).toBeCloseTo(0.66, 4);

      // API Call 3: Large call that would exceed limit
      // gpt-4 (100000 input, 50000 output) = $6.00
      // Total would be: 0.66 + 6.00 = 6.66 (still under $10)
      costCheck = await usageEnforcer.checkCostLimit(testUserId, 6.0);
      expect(costCheck.allowed).toBe(true);

      await tokenTracker.recordTokenUsageWithCost(
        testUserId,
        'gpt-4',
        100000,
        50000
      );

      user = (
        await db.select().from(users).where(eq(users.id, testUserId)).limit(1)
      )[0];
      expect(parseFloat(user.costUsedMonthlyUsd)).toBeCloseTo(6.66, 4);

      // API Call 4: Another large call that WOULD exceed limit
      // gpt-4 (100000 input, 50000 output) = $6.00
      // Total would be: 6.66 + 6.00 = 12.66 (exceeds $10 limit)
      costCheck = await usageEnforcer.checkCostLimit(testUserId, 6.0);
      expect(costCheck.allowed).toBe(false);
      expect(costCheck.reason).toContain('Monthly cost limit exceeded');

      // Should NOT record this usage since it was rejected
      // Verify cost hasn't changed
      user = (
        await db.select().from(users).where(eq(users.id, testUserId)).limit(1)
      )[0];
      expect(parseFloat(user.costUsedMonthlyUsd)).toBeCloseTo(6.66, 4);
    });

    it('should handle billing month reset correctly', async () => {
      // Set old billing month with high usage
      await db
        .update(users)
        .set({
          costUsedMonthlyUsd: '9.99',
          tokensUsedMonthly: 100000,
          billingMonth: '2023-01', // Old month
        })
        .where(eq(users.id, testUserId));

      // New API call in current month should reset usage
      await tokenTracker.recordTokenUsageWithCost(
        testUserId,
        'gpt-4',
        1000,
        500
      );

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      // Should have reset to just the new call's cost
      expect(parseFloat(user.costUsedMonthlyUsd)).toBeCloseTo(0.06, 4);
      expect(user.tokensUsedMonthly).toBe(1500);
      expect(user.billingMonth).not.toBe('2023-01');
    });
  });

  describe('Error handling', () => {
    it('should throw error if cost calculator not set', async () => {
      const trackerWithoutCalculator = new TokenTracker();

      await expect(
        trackerWithoutCalculator.recordTokenUsageWithCost(
          testUserId,
          'gpt-4',
          1000,
          500
        )
      ).rejects.toThrow('Cost calculator not set');
    });

    it('should throw error for invalid model', async () => {
      await expect(
        tokenTracker.recordTokenUsageWithCost(
          testUserId,
          'invalid-model',
          1000,
          500
        )
      ).rejects.toThrow('Pricing not found for model');
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        tokenTracker.recordTokenUsageWithCost(
          '00000000-0000-0000-0000-000000000000',
          'gpt-4',
          1000,
          500
        )
      ).rejects.toThrow('User not found');
    });
  });
});
