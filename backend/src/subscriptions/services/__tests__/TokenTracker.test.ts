/**
 * Unit tests for TokenTracker
 *
 * Currently simplified since AI features are not implemented yet.
 */

import { TokenTracker } from '../TokenTracker.js';

describe('TokenTracker', () => {
  let tracker: TokenTracker;

  beforeEach(() => {
    tracker = new TokenTracker();
  });

  describe('setCostCalculator', () => {
    it('should be a no-op since AI features are not active', () => {
      expect(() => tracker.setCostCalculator({})).not.toThrow();
    });
  });

  describe('recordTokenUsage', () => {
    it('should be a no-op since AI features are not active', async () => {
      await expect(
        tracker.recordTokenUsage('test-user-id', 1000)
      ).resolves.toBeUndefined();
    });
  });

  describe('getCurrentUsage', () => {
    it('should return zero usage since AI features are not active', async () => {
      const usage = await tracker.getCurrentUsage('test-user-id');

      expect(usage.userId).toBe('test-user-id');
      expect(usage.tokensUsed).toBe(0);
      expect(usage.costUsedUSD).toBe(0);
      expect(usage.billingMonth).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('resetMonthlyUsage', () => {
    it('should be a no-op since AI features are not active', async () => {
      await expect(
        tracker.resetMonthlyUsage('test-user-id')
      ).resolves.toBeUndefined();
    });
  });

  describe('canConsumeTokens', () => {
    it('should always return true since AI features are not active', async () => {
      const canConsume = await tracker.canConsumeTokens('test-user-id', 1000);
      expect(canConsume).toBe(true);
    });
  });

  describe('recordTokenUsageWithCost', () => {
    it('should be a no-op since AI features are not active', async () => {
      await expect(
        tracker.recordTokenUsageWithCost('test-user-id', 'gpt-4', 100, 200)
      ).resolves.toBeUndefined();
    });
  });
});
