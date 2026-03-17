/**
 * Property-based tests for TokenTracker
 *
 * Feature: mercado-pago-subscription-system
 * Tests Requirements: 6.1, 6.2, 6.3, 6.4
 */

import * as fc from 'fast-check';
import { TokenTracker } from '../TokenTracker.js';
import { db, users } from '../../../db/client.js';
import { eq } from 'drizzle-orm';
import { SENTINEL_VALUE } from '../../models/types.js';

describe('TokenTracker - Property-Based Tests', () => {
  let tracker: TokenTracker;

  beforeEach(() => {
    tracker = new TokenTracker();
  });

  /**
   * **Validates: Requirements 6.1, 6.2**
   *
   * Property 11: Token Usage Accumulation
   * For any sequence of OpenAI API calls by a user within a billing month,
   * the cumulative token count stored in the database must equal the sum
   * of all tokens consumed in those calls.
   */
  describe('Property 11: Token usage accumulation', () => {
    it('should accumulate tokens correctly for any sequence of token counts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 1, max: 10000 }), {
            minLength: 1,
            maxLength: 20,
          }),
          async (tokenCounts) => {
            // Create test user
            const [user] = await db
              .insert(users)
              .values({
                email: `test-${Date.now()}-${Math.random()}@example.com`,
                passwordHash: 'test-hash',
                subscriptionPlan: 'pro',
                subscriptionStatus: 'active',
                tokensLimitMonthly: 1000000,
                costLimitMonthlyUsd: '100.0000',
                tokensUsedMonthly: 0,
                costUsedMonthlyUsd: '0',
                billingMonth: null,
              })
              .returning();

            try {
              // Record all token usage
              for (const tokens of tokenCounts) {
                await tracker.recordTokenUsage(user.id, tokens);
              }

              // Get current usage
              const usage = await tracker.getCurrentUsage(user.id);

              // Calculate expected sum
              const expectedSum = tokenCounts.reduce(
                (sum, tokens) => sum + tokens,
                0
              );

              // Verify accumulation
              expect(usage.tokensUsed).toBe(expectedSum);
            } finally {
              // Cleanup
              await db.delete(users).where(eq(users.id, user.id));
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Validates: Requirements 6.3, 6.4**
   *
   * Property 12: Monthly Token Reset
   * For any user, when a new billing month starts, the monthly token count
   * must be reset to zero.
   */
  describe('Property 12: Monthly token reset', () => {
    it('should reset usage to zero for any previous usage amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000000 }),
          async (previousUsage) => {
            // Create test user with previous usage
            const [user] = await db
              .insert(users)
              .values({
                email: `test-${Date.now()}-${Math.random()}@example.com`,
                passwordHash: 'test-hash',
                subscriptionPlan: 'pro',
                subscriptionStatus: 'active',
                tokensLimitMonthly: 1000000,
                costLimitMonthlyUsd: '100.0000',
                tokensUsedMonthly: previousUsage,
                costUsedMonthlyUsd: '0',
                billingMonth: '2023-01',
              })
              .returning();

            try {
              // Reset usage
              await tracker.resetMonthlyUsage(user.id);

              // Verify reset
              const [updatedUser] = await db
                .select()
                .from(users)
                .where(eq(users.id, user.id))
                .limit(1);

              expect(updatedUser.tokensUsedMonthly).toBe(0);
              expect(updatedUser.costUsedMonthlyUsd).toBe('0');
            } finally {
              // Cleanup
              await db.delete(users).where(eq(users.id, user.id));
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Validates: Requirements 8.3, 8.4, 8.5, 8.6**
   *
   * Property 14: Sentinel Value Bypass
   * For any resource type (tokens, cost, clinical notes, recording minutes),
   * if a user's limit is set to the sentinel value (-1), any usage attempt
   * must be allowed regardless of current usage.
   */
  describe('Property 14: Sentinel value bypass for tokens', () => {
    it('should allow any token consumption when limit is sentinel value', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000000 }), // current usage
          fc.integer({ min: 1, max: 1000000 }), // estimated tokens
          async (currentUsage, estimatedTokens) => {
            // Create test user with unlimited tokens
            const [user] = await db
              .insert(users)
              .values({
                email: `test-${Date.now()}-${Math.random()}@example.com`,
                passwordHash: 'test-hash',
                subscriptionPlan: 'enterprise',
                subscriptionStatus: 'active',
                tokensLimitMonthly: SENTINEL_VALUE,
                costLimitMonthlyUsd: '100.0000',
                tokensUsedMonthly: currentUsage,
                costUsedMonthlyUsd: '0',
                billingMonth: new Date().toISOString().slice(0, 7),
              })
              .returning();

            try {
              // Check if can consume tokens
              const canConsume = await tracker.canConsumeTokens(
                user.id,
                estimatedTokens
              );

              // Should always be true for sentinel value
              expect(canConsume).toBe(true);
            } finally {
              // Cleanup
              await db.delete(users).where(eq(users.id, user.id));
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Validates: Requirements 8.1, 8.2, 8.4, 8.5, 8.6**
   *
   * Property 15: Token Limit Enforcement
   * For any user with a non-sentinel token limit, if the current monthly
   * token usage plus the estimated tokens for a new API call exceeds the
   * limit, the system must reject the API call with a "limit exceeded" error.
   */
  describe('Property 15: Token limit enforcement', () => {
    it('should enforce token limits correctly for any limit and usage combination', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 100000 }), // limit
          fc.integer({ min: 0, max: 100000 }), // current usage
          fc.integer({ min: 1, max: 10000 }), // estimated tokens
          async (limit, currentUsage, estimatedTokens) => {
            // Ensure current usage doesn't exceed limit
            const actualCurrentUsage = Math.min(currentUsage, limit);

            // Create test user
            const [user] = await db
              .insert(users)
              .values({
                email: `test-${Date.now()}-${Math.random()}@example.com`,
                passwordHash: 'test-hash',
                subscriptionPlan: 'pro',
                subscriptionStatus: 'active',
                tokensLimitMonthly: limit,
                costLimitMonthlyUsd: '100.0000',
                tokensUsedMonthly: actualCurrentUsage,
                costUsedMonthlyUsd: '0',
                billingMonth: new Date().toISOString().slice(0, 7),
              })
              .returning();

            try {
              // Check if can consume tokens
              const canConsume = await tracker.canConsumeTokens(
                user.id,
                estimatedTokens
              );

              // Calculate expected result
              const remainingTokens = limit - actualCurrentUsage;
              const expectedCanConsume = remainingTokens >= estimatedTokens;

              // Verify enforcement
              expect(canConsume).toBe(expectedCanConsume);
            } finally {
              // Cleanup
              await db.delete(users).where(eq(users.id, user.id));
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property: Billing month format consistency
   * For any token usage recording, the billing month must always be in
   * YYYY-MM format with zero-padded month.
   */
  describe('Property: Billing month format consistency', () => {
    it('should always use YYYY-MM format for billing month', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 10000 }), async (tokens) => {
          // Create test user
          const [user] = await db
            .insert(users)
            .values({
              email: `test-${Date.now()}-${Math.random()}@example.com`,
              passwordHash: 'test-hash',
              subscriptionPlan: 'pro',
              subscriptionStatus: 'active',
              tokensLimitMonthly: 100000,
              costLimitMonthlyUsd: '100.0000',
              tokensUsedMonthly: 0,
              costUsedMonthlyUsd: '0',
              billingMonth: null,
            })
            .returning();

          try {
            // Record usage
            await tracker.recordTokenUsage(user.id, tokens);

            // Get usage
            const usage = await tracker.getCurrentUsage(user.id);

            // Verify format
            expect(usage.billingMonth).toMatch(/^\d{4}-\d{2}$/);

            // Verify month is zero-padded
            const month = usage.billingMonth.split('-')[1];
            expect(month.length).toBe(2);
          } finally {
            // Cleanup
            await db.delete(users).where(eq(users.id, user.id));
          }
        }),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Property: Usage reset on billing month change
   * For any user with usage in an old billing month, when recording new
   * usage in the current month, the old usage should be discarded and
   * only the new usage should be counted.
   */
  describe('Property: Usage reset on billing month change', () => {
    it('should reset usage when billing month changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50000 }), // old usage
          fc.integer({ min: 1, max: 10000 }), // new usage
          async (oldUsage, newUsage) => {
            // Create test user with old billing month
            const [user] = await db
              .insert(users)
              .values({
                email: `test-${Date.now()}-${Math.random()}@example.com`,
                passwordHash: 'test-hash',
                subscriptionPlan: 'pro',
                subscriptionStatus: 'active',
                tokensLimitMonthly: 100000,
                costLimitMonthlyUsd: '100.0000',
                tokensUsedMonthly: oldUsage,
                costUsedMonthlyUsd: '0',
                billingMonth: '2023-01',
              })
              .returning();

            try {
              // Record new usage (should reset because month changed)
              await tracker.recordTokenUsage(user.id, newUsage);

              // Get current usage
              const usage = await tracker.getCurrentUsage(user.id);

              // Should only have new usage, not old + new
              expect(usage.tokensUsed).toBe(newUsage);
            } finally {
              // Cleanup
              await db.delete(users).where(eq(users.id, user.id));
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
