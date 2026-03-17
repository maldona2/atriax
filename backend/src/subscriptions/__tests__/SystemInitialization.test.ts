/**
 * System Initialization Integration Tests
 *
 * Tests the complete wiring and initialization of all subscription system components.
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 17.1
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeSubscriptionSystem,
  getSubscriptionComponents,
  isSubscriptionSystemInitialized,
} from '../init.js';
import { db, modelPricing } from '../../db/client.js';
import pool from '../../db/connect.js';

describe('Subscription System Initialization', () => {
  beforeAll(async () => {
    // Ensure model pricing data exists for Cost Calculator
    const existingPricing = await db.select().from(modelPricing).limit(1);

    if (existingPricing.length === 0) {
      // Seed minimal pricing data for tests
      await db.insert(modelPricing).values([
        {
          modelName: 'gpt-4',
          inputTokenPriceUsd: '0.00003',
          outputTokenPriceUsd: '0.00006',
          effectiveDate: new Date('2024-01-01'),
        },
      ]);
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('initializeSubscriptionSystem', () => {
    it('should initialize all components successfully', async () => {
      const components = await initializeSubscriptionSystem();

      // Verify all components are initialized
      expect(components).toBeDefined();
      expect(components.planManager).toBeDefined();
      expect(components.paymentGateway).toBeDefined();
      expect(components.costCalculator).toBeDefined();
      expect(components.tokenTracker).toBeDefined();
      expect(components.usageEnforcer).toBeDefined();
      expect(components.webhookHandler).toBeDefined();
    });

    it('should mark system as initialized', async () => {
      expect(isSubscriptionSystemInitialized()).toBe(true);
    });

    it('should return same components on subsequent calls', async () => {
      const components1 = getSubscriptionComponents();
      const components2 = getSubscriptionComponents();

      expect(components1).toBe(components2);
    });
  });

  describe('Plan Manager Integration', () => {
    it('should have all three plans defined', () => {
      const components = getSubscriptionComponents();
      const plans = components.planManager.getPlans();

      expect(plans).toHaveLength(3);
      expect(plans.map((p) => p.name)).toEqual(
        expect.arrayContaining(['free', 'pro', 'enterprise'])
      );
    });

    it('should retrieve plan by name', () => {
      const components = getSubscriptionComponents();
      const proPlan = components.planManager.getPlan('pro');

      expect(proPlan).toBeDefined();
      expect(proPlan?.name).toBe('pro');
      expect(proPlan?.priceARS).toBeGreaterThan(0);
    });

    it('should retrieve plan limits', () => {
      const components = getSubscriptionComponents();
      const limits = components.planManager.getLimits('free');

      expect(limits).toBeDefined();
      expect(limits?.clinicalNotesMonthly).toBeGreaterThan(0);
      expect(limits?.recordingMinutesDaily).toBeGreaterThan(0);
      expect(limits?.tokensMonthly).toBeGreaterThan(0);
      expect(limits?.costMonthlyUSD).toBeGreaterThan(0);
    });
  });

  describe('Payment Gateway Integration', () => {
    it('should format external reference correctly', () => {
      const components = getSubscriptionComponents();
      const reference = components.paymentGateway.formatExternalReference(
        'user-123',
        'pro'
      );

      expect(reference).toBe('user:user-123|plan:pro');
    });
  });

  describe('Cost Calculator Integration', () => {
    it('should be initialized with pricing data', () => {
      const components = getSubscriptionComponents();

      expect(components.costCalculator.isInitialized()).toBe(true);
    });

    it('should calculate costs correctly', () => {
      const components = getSubscriptionComponents();
      const cost = components.costCalculator.calculateCost('gpt-4', 1000, 500);

      expect(cost).toBeDefined();
      expect(cost.inputCost).toBeGreaterThan(0);
      expect(cost.outputCost).toBeGreaterThan(0);
      expect(cost.totalCost).toBe(cost.inputCost + cost.outputCost);
    });

    it('should maintain precision to at least 4 decimal places', () => {
      const components = getSubscriptionComponents();
      // Use smaller token counts to get a result with more decimal places
      const cost = components.costCalculator.calculateCost('gpt-4', 123, 45);

      // The cost calculation should support at least 4 decimal places
      // We verify this by checking that the calculation doesn't lose precision
      expect(cost.totalCost).toBeGreaterThan(0);

      // Verify the cost is calculated with high precision (8 decimal places internally)
      // by checking that very small costs are not rounded to zero
      const smallCost = components.costCalculator.calculateCost('gpt-4', 1, 1);
      expect(smallCost.totalCost).toBeGreaterThan(0);
      expect(smallCost.totalCost).toBeLessThan(0.001); // Should be a very small number
    });
  });

  describe('Component Dependencies', () => {
    it('should have Token Tracker ready for usage tracking', () => {
      const components = getSubscriptionComponents();

      expect(components.tokenTracker).toBeDefined();
      expect(typeof components.tokenTracker.recordTokenUsage).toBe('function');
      expect(typeof components.tokenTracker.getCurrentUsage).toBe('function');
    });

    it('should have Usage Enforcer ready for limit checks', () => {
      const components = getSubscriptionComponents();

      expect(components.usageEnforcer).toBeDefined();
      expect(typeof components.usageEnforcer.checkTokenLimit).toBe('function');
      expect(typeof components.usageEnforcer.checkCostLimit).toBe('function');
      expect(typeof components.usageEnforcer.checkClinicalNotesLimit).toBe(
        'function'
      );
      expect(typeof components.usageEnforcer.checkRecordingMinutesLimit).toBe(
        'function'
      );
    });

    it('should have Webhook Handler ready for webhook processing', () => {
      const components = getSubscriptionComponents();

      expect(components.webhookHandler).toBeDefined();
      expect(typeof components.webhookHandler.validateWebhook).toBe('function');
      expect(typeof components.webhookHandler.parseExternalReference).toBe(
        'function'
      );
      expect(typeof components.webhookHandler.handlePaymentWebhook).toBe(
        'function'
      );
      expect(typeof components.webhookHandler.handlePreApprovalWebhook).toBe(
        'function'
      );
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required environment variables', () => {
      // This test passes if initialization succeeded without throwing
      expect(isSubscriptionSystemInitialized()).toBe(true);
    });

    it('should have Mercado Pago credentials configured', () => {
      const components = getSubscriptionComponents();

      // Payment gateway should be initialized (constructor would throw if credentials missing)
      expect(components.paymentGateway).toBeDefined();
    });

    it('should have webhook secret configured', () => {
      const components = getSubscriptionComponents();

      // Webhook handler should be initialized (constructor would throw if secret missing)
      expect(components.webhookHandler).toBeDefined();
    });
  });
});
