/**
 * Unit tests for WebhookHandler
 *
 * Tests Requirements: 4.1, 4.3, 4.7, 5.1, 13.3, 13.7
 */

import crypto from 'crypto';
import { WebhookHandler } from '../WebhookHandler.js';
import { db, webhookEvents, users, subscriptions } from '../../../db/client.js';
import { eq } from 'drizzle-orm';

describe('WebhookHandler', () => {
  let handler: WebhookHandler;
  const testSecret = 'test-webhook-secret-key';
  const testAccessToken = 'test-access-token';
  const testWebhookIds: string[] = [];

  beforeEach(() => {
    handler = new WebhookHandler(testSecret, testAccessToken);
  });

  afterEach(async () => {
    // Clean up test webhook events
    for (const webhookId of testWebhookIds) {
      await db
        .delete(webhookEvents)
        .where(eq(webhookEvents.webhookId, webhookId));
    }
    testWebhookIds.length = 0;
  });

  describe('validateWebhook', () => {
    it('should return true for valid signature', () => {
      const payload = JSON.stringify({ id: '123', type: 'payment' });
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(payload);
      const validSignature = hmac.digest('hex');

      const result = handler.validateWebhook(validSignature, payload);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = JSON.stringify({ id: '123', type: 'payment' });
      const invalidSignature = 'invalid-signature-12345';

      const result = handler.validateWebhook(invalidSignature, payload);

      expect(result).toBe(false);
    });

    it('should return false for tampered payload', () => {
      const originalPayload = JSON.stringify({ id: '123', type: 'payment' });
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(originalPayload);
      const signature = hmac.digest('hex');

      const tamperedPayload = JSON.stringify({ id: '456', type: 'payment' });

      const result = handler.validateWebhook(signature, tamperedPayload);

      expect(result).toBe(false);
    });

    it('should return false for empty signature', () => {
      const payload = JSON.stringify({ id: '123', type: 'payment' });

      const result = handler.validateWebhook('', payload);

      expect(result).toBe(false);
    });

    it('should handle signature validation errors gracefully', () => {
      const payload = JSON.stringify({ id: '123', type: 'payment' });
      const malformedSignature = 'not-a-hex-string!@#$';

      const result = handler.validateWebhook(malformedSignature, payload);

      expect(result).toBe(false);
    });
  });

  describe('parseExternalReference', () => {
    it('should parse valid external reference with pro plan', () => {
      const reference = 'user:550e8400-e29b-41d4-a716-446655440000|plan:pro';

      const result = handler.parseExternalReference(reference);

      expect(result).toEqual({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        plan: 'pro',
      });
    });

    it('should parse valid external reference with gold plan', () => {
      const reference = 'user:123e4567-e89b-12d3-a456-426614174000|plan:gold';

      const result = handler.parseExternalReference(reference);

      expect(result).toEqual({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        plan: 'gold',
      });
    });

    it('should throw error for missing user part', () => {
      const reference = 'plan:pro';

      expect(() => handler.parseExternalReference(reference)).toThrow(
        'Invalid external reference format'
      );
    });

    it('should throw error for missing plan part', () => {
      const reference = 'user:550e8400-e29b-41d4-a716-446655440000';

      expect(() => handler.parseExternalReference(reference)).toThrow(
        'Invalid external reference format'
      );
    });

    it('should throw error for malformed reference', () => {
      const reference = 'invalid-format';

      expect(() => handler.parseExternalReference(reference)).toThrow(
        'Invalid external reference format'
      );
    });

    it('should throw error for empty reference', () => {
      const reference = '';

      expect(() => handler.parseExternalReference(reference)).toThrow(
        'Invalid external reference format'
      );
    });

    it('should parse reference even with different content after pipe', () => {
      // The regex looks for user: and plan: patterns, so as long as both exist, it works
      const reference = 'user:123|plan:pro|extra:data';

      const result = handler.parseExternalReference(reference);

      expect(result).toEqual({
        userId: '123',
        plan: 'pro',
      });
    });
  });

  describe('isWebhookProcessed', () => {
    it('should return true if webhook already exists', async () => {
      const webhookId = `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testWebhookIds.push(webhookId);

      // Insert webhook event
      await db.insert(webhookEvents).values({
        webhookId,
        webhookType: 'payment',
        payload: { id: '123', type: 'payment' },
        signatureValid: true,
      });

      const result = await handler.isWebhookProcessed(webhookId);

      expect(result).toBe(true);
    });

    it('should return false if webhook does not exist', async () => {
      const webhookId = `webhook-nonexistent-${Date.now()}`;

      const result = await handler.isWebhookProcessed(webhookId);

      expect(result).toBe(false);
    });
  });

  describe('logWebhookEvent', () => {
    it('should not throw when logging payment webhook event', async () => {
      const webhookId = `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testWebhookIds.push(webhookId);

      // Should not throw even if insert fails
      await expect(
        handler.logWebhookEvent(
          webhookId,
          'payment',
          { id: '123', type: 'payment' },
          true,
          'user-456',
          undefined
        )
      ).resolves.toBeUndefined();
    });

    it('should not throw when logging preapproval webhook event with action', async () => {
      const webhookId = `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testWebhookIds.push(webhookId);

      await expect(
        handler.logWebhookEvent(
          webhookId,
          'preapproval',
          { id: '789', type: 'preapproval', action: 'authorized' },
          true,
          'user-123',
          'authorized'
        )
      ).resolves.toBeUndefined();
    });

    it('should not throw when logging webhook with invalid signature', async () => {
      const webhookId = `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testWebhookIds.push(webhookId);

      await expect(
        handler.logWebhookEvent(
          webhookId,
          'payment',
          { id: '999', type: 'payment' },
          false,
          undefined,
          undefined
        )
      ).resolves.toBeUndefined();
    });

    it('should not throw error if logging fails due to duplicate webhook ID', async () => {
      const webhookId = `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testWebhookIds.push(webhookId);

      // Try to insert twice with same webhook ID (should not throw)
      await expect(
        handler.logWebhookEvent(
          webhookId,
          'payment',
          { id: '111', type: 'payment' },
          true,
          'user-222',
          undefined
        )
      ).resolves.toBeUndefined();

      await expect(
        handler.logWebhookEvent(
          webhookId,
          'payment',
          { id: '111', type: 'payment' },
          true,
          'user-222',
          undefined
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('handlePaymentWebhook', () => {
    beforeEach(() => {
      // Reset fetch mock before each test
      global.fetch = jest.fn();
    });

    it('should process payment webhook successfully', async () => {
      // Create a test user first with unique ID
      const testUserId = `550e8400-e29b-41d4-a716-${Date.now().toString().slice(-12).padStart(12, '0')}`;
      const testPreapprovalId = `preapproval-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Mock fetch for payment details
      const mockPaymentDetails = {
        id: 'payment-456',
        external_reference: `user:${testUserId}|plan:pro`,
        preapproval_id: testPreapprovalId,
        status: 'approved',
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaymentDetails,
      } as Response);

      const webhook = {
        id: `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'payment' as const,
        data: { id: 'payment-456' },
      };
      testWebhookIds.push(webhook.id);

      await db.insert(users).values({
        id: testUserId,
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'hash',
        subscriptionPlan: 'pro',
        subscriptionStatus: 'active',
      });

      await handler.handlePaymentWebhook(webhook);

      // Verify user subscription was updated
      const updatedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(updatedUser[0].subscriptionPlan).toBe('pro');
      expect(updatedUser[0].subscriptionStatus).toBe('active');

      // Verify subscription record was created
      const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.preapprovalId, testPreapprovalId))
        .limit(1);

      expect(subscription.length).toBe(1);
      expect(subscription[0].userId).toBe(testUserId);
      expect(subscription[0].plan).toBe('pro');
      expect(subscription[0].status).toBe('authorized');

      // Verify webhook was logged
      const logged = await db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.webhookId, webhook.id))
        .limit(1);

      expect(logged.length).toBe(1);
      expect(logged[0].webhookType).toBe('payment');
      expect(logged[0].userId).toBe(testUserId);

      // Cleanup - delete in correct order due to foreign keys
      await db
        .delete(webhookEvents)
        .where(eq(webhookEvents.webhookId, webhook.id));
      await db
        .delete(subscriptions)
        .where(eq(subscriptions.preapprovalId, testPreapprovalId));
      await db.delete(users).where(eq(users.id, testUserId));
    });

    it('should handle idempotency - skip already processed webhook', async () => {
      const webhook = {
        id: `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'payment' as const,
        data: { id: 'payment-456' },
      };
      testWebhookIds.push(webhook.id);

      // Pre-insert webhook event to simulate already processed
      await db.insert(webhookEvents).values({
        webhookId: webhook.id,
        webhookType: 'payment',
        payload: webhook,
        signatureValid: true,
      });

      // Should not throw and should skip processing
      await expect(
        handler.handlePaymentWebhook(webhook)
      ).resolves.toBeUndefined();

      // Verify fetch was not called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error if payment has no external reference', async () => {
      const mockPaymentDetails = {
        id: 'payment-456',
        status: 'approved',
        // No external_reference
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaymentDetails,
      } as Response);

      const webhook = {
        id: `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'payment' as const,
        data: { id: 'payment-456' },
      };
      testWebhookIds.push(webhook.id);

      await expect(handler.handlePaymentWebhook(webhook)).rejects.toThrow(
        'Payment does not have external reference'
      );
    });
  });

  describe('handlePreApprovalWebhook', () => {
    it('should handle authorized action - update subscription status to active', async () => {
      // Create test user and subscription
      const testUserId = `550e8400-e29b-41d4-a716-${Date.now().toString().slice(-12).padStart(12, '0')}`;
      const testPreapprovalId = `preapproval-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await db.insert(users).values({
        id: testUserId,
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'hash',
        subscriptionPlan: 'pro',
        subscriptionStatus: 'paused',
      });

      await db.insert(subscriptions).values({
        userId: testUserId,
        preapprovalId: testPreapprovalId,
        plan: 'pro',
        status: 'paused',
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const webhook = {
        id: `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'preapproval' as const,
        action: 'authorized' as const,
        data: { id: testPreapprovalId },
      };
      testWebhookIds.push(webhook.id);

      await handler.handlePreApprovalWebhook(webhook);

      // Verify subscription status updated to authorized
      const updatedSubscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.preapprovalId, testPreapprovalId))
        .limit(1);

      expect(updatedSubscription[0].status).toBe('authorized');

      // Verify user subscription status updated to active
      const updatedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(updatedUser[0].subscriptionStatus).toBe('active');

      // Verify webhook was logged
      const logged = await db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.webhookId, webhook.id))
        .limit(1);

      expect(logged.length).toBe(1);
      expect(logged[0].webhookType).toBe('preapproval');
      expect(logged[0].action).toBe('authorized');
      expect(logged[0].userId).toBe(testUserId);

      // Cleanup
      await db
        .delete(webhookEvents)
        .where(eq(webhookEvents.webhookId, webhook.id));
      await db
        .delete(subscriptions)
        .where(eq(subscriptions.preapprovalId, testPreapprovalId));
      await db.delete(users).where(eq(users.id, testUserId));
    });

    it('should handle cancelled action - downgrade user to pro plan', async () => {
      // Create test user and subscription
      const testUserId = `550e8400-e29b-41d4-a716-${Date.now().toString().slice(-12).padStart(12, '0')}`;
      const testPreapprovalId = `preapproval-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await db.insert(users).values({
        id: testUserId,
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'hash',
        subscriptionPlan: 'gold',
        subscriptionStatus: 'active',
      });

      await db.insert(subscriptions).values({
        userId: testUserId,
        preapprovalId: testPreapprovalId,
        plan: 'gold',
        status: 'authorized',
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const webhook = {
        id: `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'preapproval' as const,
        action: 'cancelled' as const,
        data: { id: testPreapprovalId },
      };
      testWebhookIds.push(webhook.id);

      await handler.handlePreApprovalWebhook(webhook);

      // Verify subscription status updated to cancelled
      const updatedSubscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.preapprovalId, testPreapprovalId))
        .limit(1);

      expect(updatedSubscription[0].status).toBe('cancelled');

      // Verify user downgraded to pro plan
      const updatedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(updatedUser[0].subscriptionPlan).toBe('pro');
      expect(updatedUser[0].subscriptionStatus).toBe('cancelled');

      // Verify webhook was logged
      const logged = await db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.webhookId, webhook.id))
        .limit(1);

      expect(logged.length).toBe(1);
      expect(logged[0].webhookType).toBe('preapproval');
      expect(logged[0].action).toBe('cancelled');
      expect(logged[0].userId).toBe(testUserId);

      // Cleanup
      await db
        .delete(webhookEvents)
        .where(eq(webhookEvents.webhookId, webhook.id));
      await db
        .delete(subscriptions)
        .where(eq(subscriptions.preapprovalId, testPreapprovalId));
      await db.delete(users).where(eq(users.id, testUserId));
    });

    it('should handle paused action - update subscription status to paused', async () => {
      // Create test user and subscription
      const testUserId = `550e8400-e29b-41d4-a716-${Date.now().toString().slice(-12).padStart(12, '0')}`;
      const testPreapprovalId = `preapproval-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await db.insert(users).values({
        id: testUserId,
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'hash',
        subscriptionPlan: 'gold',
        subscriptionStatus: 'active',
      });

      await db.insert(subscriptions).values({
        userId: testUserId,
        preapprovalId: testPreapprovalId,
        plan: 'gold',
        status: 'authorized',
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const webhook = {
        id: `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'preapproval' as const,
        action: 'paused' as const,
        data: { id: testPreapprovalId },
      };
      testWebhookIds.push(webhook.id);

      await handler.handlePreApprovalWebhook(webhook);

      // Verify subscription status updated to paused
      const updatedSubscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.preapprovalId, testPreapprovalId))
        .limit(1);

      expect(updatedSubscription[0].status).toBe('paused');

      // Verify user subscription status updated to paused
      const updatedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(updatedUser[0].subscriptionStatus).toBe('paused');
      // Plan should remain gold
      expect(updatedUser[0].subscriptionPlan).toBe('gold');

      // Verify webhook was logged
      const logged = await db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.webhookId, webhook.id))
        .limit(1);

      expect(logged.length).toBe(1);
      expect(logged[0].webhookType).toBe('preapproval');
      expect(logged[0].action).toBe('paused');
      expect(logged[0].userId).toBe(testUserId);

      // Cleanup
      await db
        .delete(webhookEvents)
        .where(eq(webhookEvents.webhookId, webhook.id));
      await db
        .delete(subscriptions)
        .where(eq(subscriptions.preapprovalId, testPreapprovalId));
      await db.delete(users).where(eq(users.id, testUserId));
    });

    it('should handle failed action - update subscription status to failed', async () => {
      // Create test user and subscription
      const testUserId = `550e8400-e29b-41d4-a716-${Date.now().toString().slice(-12).padStart(12, '0')}`;
      const testPreapprovalId = `preapproval-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await db.insert(users).values({
        id: testUserId,
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'hash',
        subscriptionPlan: 'pro',
        subscriptionStatus: 'active',
      });

      await db.insert(subscriptions).values({
        userId: testUserId,
        preapprovalId: testPreapprovalId,
        plan: 'pro',
        status: 'authorized',
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const webhook = {
        id: `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'preapproval' as const,
        action: 'failed' as const,
        data: { id: testPreapprovalId },
      };
      testWebhookIds.push(webhook.id);

      await handler.handlePreApprovalWebhook(webhook);

      // Verify subscription status updated to failed
      const updatedSubscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.preapprovalId, testPreapprovalId))
        .limit(1);

      expect(updatedSubscription[0].status).toBe('failed');

      // Verify user subscription status updated to cancelled
      const updatedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(updatedUser[0].subscriptionStatus).toBe('cancelled');

      // Verify webhook was logged
      const logged = await db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.webhookId, webhook.id))
        .limit(1);

      expect(logged.length).toBe(1);
      expect(logged[0].webhookType).toBe('preapproval');
      expect(logged[0].action).toBe('failed');
      expect(logged[0].userId).toBe(testUserId);

      // Cleanup
      await db
        .delete(webhookEvents)
        .where(eq(webhookEvents.webhookId, webhook.id));
      await db
        .delete(subscriptions)
        .where(eq(subscriptions.preapprovalId, testPreapprovalId));
      await db.delete(users).where(eq(users.id, testUserId));
    });

    it('should handle idempotency - skip already processed PreApproval webhook', async () => {
      const webhook = {
        id: `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'preapproval' as const,
        action: 'authorized' as const,
        data: { id: 'preapproval-123' },
      };
      testWebhookIds.push(webhook.id);

      // Pre-insert webhook event to simulate already processed
      await db.insert(webhookEvents).values({
        webhookId: webhook.id,
        webhookType: 'preapproval',
        payload: webhook,
        signatureValid: true,
      });

      // Should not throw and should skip processing
      await expect(
        handler.handlePreApprovalWebhook(webhook)
      ).resolves.toBeUndefined();
    });

    it('should throw error if subscription not found for PreApproval ID', async () => {
      const webhook = {
        id: `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'preapproval' as const,
        action: 'authorized' as const,
        data: { id: 'nonexistent-preapproval-id' },
      };
      testWebhookIds.push(webhook.id);

      await expect(handler.handlePreApprovalWebhook(webhook)).rejects.toThrow(
        'Subscription not found for PreApproval ID: nonexistent-preapproval-id'
      );

      // Verify failed webhook was logged
      const logged = await db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.webhookId, webhook.id))
        .limit(1);

      expect(logged.length).toBe(1);
      expect(logged[0].action).toBe('authorized_processing_failed');
    });

    it('should log all PreApproval status changes with timestamp and PreApproval ID', async () => {
      // Create test user and subscription
      const testUserId = `550e8400-e29b-41d4-a716-${Date.now().toString().slice(-12).padStart(12, '0')}`;
      const testPreapprovalId = `preapproval-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await db.insert(users).values({
        id: testUserId,
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'hash',
        subscriptionPlan: 'pro',
        subscriptionStatus: 'active',
      });

      await db.insert(subscriptions).values({
        userId: testUserId,
        preapprovalId: testPreapprovalId,
        plan: 'pro',
        status: 'authorized',
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const webhook = {
        id: `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'preapproval' as const,
        action: 'paused' as const,
        data: { id: testPreapprovalId },
      };
      testWebhookIds.push(webhook.id);

      await handler.handlePreApprovalWebhook(webhook);

      // Verify webhook event was logged with all required information
      const logged = await db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.webhookId, webhook.id))
        .limit(1);

      expect(logged.length).toBe(1);
      expect(logged[0].webhookId).toBe(webhook.id);
      expect(logged[0].webhookType).toBe('preapproval');
      expect(logged[0].action).toBe('paused');
      expect(logged[0].userId).toBe(testUserId);
      expect(logged[0].signatureValid).toBe(true);
      expect(logged[0].processedAt).toBeDefined();
      expect(logged[0].payload).toEqual(webhook);

      // Cleanup
      await db
        .delete(webhookEvents)
        .where(eq(webhookEvents.webhookId, webhook.id));
      await db
        .delete(subscriptions)
        .where(eq(subscriptions.preapprovalId, testPreapprovalId));
      await db.delete(users).where(eq(users.id, testUserId));
    });
  });
});
