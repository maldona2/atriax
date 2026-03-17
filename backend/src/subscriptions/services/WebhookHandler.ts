/**
 * Webhook Handler - Processes incoming notifications from Mercado Pago
 */

import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db, webhookEvents, users, subscriptions } from '../../db/client.js';
import {
  PaymentWebhook,
  PreApprovalWebhook,
  ExternalReference,
} from '../models/types.js';
import { PlanManager } from './PlanManager.js';
import logger from '../../utils/logger.js';

export class WebhookHandler {
  private webhookSecret: string;
  private accessToken: string;
  private planManager: PlanManager;

  constructor(webhookSecret: string, accessToken: string) {
    this.webhookSecret = webhookSecret;
    this.accessToken = accessToken;
    this.planManager = new PlanManager();
  }

  /**
   * Validate webhook signature using HMAC-SHA256
   * Mercado Pago sends signature in x-signature header
   */
  validateWebhook(
    signatureHeader: string,
    resourceId: string,
    requestId?: string
  ): boolean {
    try {
      if (!signatureHeader || !resourceId) {
        logger.warn(
          { signature: !!signatureHeader, resourceId: !!resourceId },
          'Invalid webhook signature validation: missing signature or resource id'
        );
        return false;
      }

      // Expected Mercado Pago signature format:
      //   ts=1730906800,v1=<hex_hmac>
      const parts = signatureHeader.split(',');
      const tsPart = parts.find((p) => p.startsWith('ts='));
      const v1Part = parts.find((p) => p.startsWith('v1='));

      if (!tsPart || !v1Part) {
        logger.warn(
          { signatureHeader },
          'Invalid webhook signature format: missing ts or v1'
        );
        return false;
      }

      const ts = tsPart.split('=')[1];
      const v1 = v1Part.split('=')[1];

      if (!ts || !v1) {
        logger.warn(
          { signatureHeader },
          'Invalid webhook signature format: empty ts or v1'
        );
        return false;
      }

      if (!requestId) {
        logger.warn(
          { resourceId, ts },
          'Missing x-request-id header for webhook signature validation'
        );
        return false;
      }

      const signedTemplate = `id:${resourceId};request-id:${requestId};ts:${ts}`;

      // Create HMAC using webhook secret and Mercado Pago template
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      hmac.update(signedTemplate);
      const expectedSignature = hmac.digest('hex');

      // Compare signatures using timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(v1),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        logger.error(
          {
            signatureLength: v1.length,
            timestamp: new Date().toISOString(),
          },
          'Security event: Invalid webhook signature detected'
        );
      }

      return isValid;
    } catch (error) {
      // Log security event - could be an attack attempt
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
          timestamp: new Date().toISOString(),
        },
        'Security event: Webhook signature validation failed with exception'
      );
      return false;
    }
  }

  /**
   * Parse external reference to extract user ID and plan
   * Format: "user:{userId}|plan:{plan}"
   */
  parseExternalReference(reference: string): ExternalReference {
    try {
      if (!reference || typeof reference !== 'string') {
        logger.error(
          { reference },
          'Invalid external reference: not a string or empty'
        );
        throw new Error(
          'Invalid external reference format: reference must be a non-empty string'
        );
      }

      const userMatch = reference.match(/user:([^|]+)/);
      const planMatch = reference.match(/plan:([^|]+)/);

      if (!userMatch || !planMatch) {
        logger.error(
          { reference },
          'Invalid external reference format: missing user or plan'
        );
        throw new Error(
          'Invalid external reference format: expected "user:{userId}|plan:{plan}"'
        );
      }

      const userId = userMatch[1];
      const plan = planMatch[1];

      // Validate plan is one of the expected values
      const validPlans = ['pro', 'gold'];
      if (!validPlans.includes(plan)) {
        logger.error(
          { reference, plan },
          'Invalid external reference: unknown plan type'
        );
        throw new Error(
          `Invalid external reference format: unknown plan "${plan}"`
        );
      }

      return {
        userId,
        plan: plan as ExternalReference['plan'],
      };
    } catch (error) {
      logger.error(
        {
          reference,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Error parsing external reference'
      );
      throw error;
    }
  }

  /**
   * Check if webhook has already been processed (idempotency)
   * Returns true if webhook is already processed
   */
  async isWebhookProcessed(webhookId: string): Promise<boolean> {
    try {
      const existing = await db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.webhookId, webhookId))
        .limit(1);

      const isProcessed = existing.length > 0;

      if (isProcessed) {
        logger.info(
          { webhookId },
          'Webhook already processed (duplicate detected)'
        );
      }

      return isProcessed;
    } catch (error) {
      logger.error(
        {
          webhookId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Database error: Failed to check webhook idempotency'
      );
      throw new Error(
        `Database error checking webhook idempotency: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Log webhook event to database
   */
  async logWebhookEvent(
    webhookId: string,
    webhookType: 'payment' | 'preapproval',
    payload: unknown,
    signatureValid: boolean,
    userId?: string,
    action?: string
  ): Promise<void> {
    try {
      await db.insert(webhookEvents).values({
        webhookId,
        webhookType,
        payload: payload as any,
        signatureValid,
        userId: userId || null,
        action: action || null,
        processedAt: new Date(),
      });

      logger.info(
        {
          webhookId,
          webhookType,
          action,
          userId,
          signatureValid,
        },
        'Webhook event logged to database'
      );
    } catch (error) {
      // Log error but don't throw - logging failure shouldn't prevent webhook processing
      logger.error(
        {
          webhookId,
          webhookType,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Database error: Failed to log webhook event (non-fatal)'
      );
    }
  }

  /**
   * Handle payment webhook
   */
  async handlePaymentWebhook(webhook: PaymentWebhook): Promise<void> {
    try {
      logger.info(
        { webhookId: webhook.id, paymentId: webhook.data.id },
        'Processing payment webhook'
      );

      // Check if webhook already processed (idempotency)
      const alreadyProcessed = await this.isWebhookProcessed(webhook.id);
      if (alreadyProcessed) {
        logger.info(
          { webhookId: webhook.id },
          'Webhook already processed, skipping (idempotent)'
        );
        return;
      }

      // Fetch payment details from Mercado Pago to get external reference
      const paymentDetails = await this.fetchPaymentDetails(webhook.data.id);

      if (!paymentDetails.external_reference) {
        logger.error(
          {
            webhookId: webhook.id,
            paymentId: webhook.data.id,
          },
          'Payment webhook error: Missing external reference'
        );
        throw new Error('Payment does not have external reference');
      }

      // Parse external reference to extract user ID and plan
      const { userId, plan } = this.parseExternalReference(
        paymentDetails.external_reference
      );

      logger.info(
        {
          webhookId: webhook.id,
          userId,
          plan,
        },
        'Parsed payment webhook external reference'
      );

      // Update user subscription plan and limits
      await this.updateUserSubscription(userId, plan);

      // Update billing period in subscriptions table
      if (paymentDetails.preapproval_id) {
        await this.updateBillingPeriod(
          paymentDetails.preapproval_id,
          userId,
          plan
        );
      }

      // Log webhook event
      await this.logWebhookEvent(
        webhook.id,
        'payment',
        webhook,
        true,
        userId,
        'payment_processed'
      );

      logger.info(
        {
          webhookId: webhook.id,
          userId,
          plan,
        },
        'Payment webhook processed successfully'
      );
    } catch (error) {
      logger.error(
        {
          webhookId: webhook.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Error processing payment webhook'
      );

      // Log failed webhook event
      await this.logWebhookEvent(
        webhook.id,
        'payment',
        webhook,
        true,
        undefined,
        'payment_processing_failed'
      );

      throw error;
    }
  }

  /**
   * Handle PreApproval webhook
   */
  /**
   * Handle PreApproval webhook
   * Processes subscription status changes: authorized, cancelled, paused, failed
   */
  async handlePreApprovalWebhook(webhook: PreApprovalWebhook): Promise<void> {
    try {
      logger.info(
        {
          webhookId: webhook.id,
          action: webhook.action,
          preapprovalId: webhook.data.id,
        },
        'Processing PreApproval webhook'
      );

      // Check if webhook already processed (idempotency)
      const alreadyProcessed = await this.isWebhookProcessed(webhook.id);
      if (alreadyProcessed) {
        logger.info(
          { webhookId: webhook.id },
          'Webhook already processed, skipping (idempotent)'
        );
        return;
      }

      // Get PreApproval ID from webhook data
      const preapprovalId = webhook.data.id;

      // Find subscription by PreApproval ID to get user ID
      const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.preapprovalId, preapprovalId))
        .limit(1);

      if (subscription.length === 0) {
        logger.error(
          {
            webhookId: webhook.id,
            preapprovalId,
          },
          'PreApproval webhook error: Subscription not found'
        );
        throw new Error(
          `Subscription not found for PreApproval ID: ${preapprovalId}`
        );
      }

      const userId = subscription[0].userId;
      const action = webhook.action as string;

      logger.info(
        {
          webhookId: webhook.id,
          userId,
          action,
          preapprovalId,
        },
        'Found subscription for PreApproval webhook'
      );

      // For "updated" events, fetch the current PreApproval status from Mercado Pago
      let effectiveAction = action;
      if (action === 'updated') {
        const details = await this.fetchPreApprovalDetails(preapprovalId);
        const status = (details?.status ?? '').toLowerCase();

        if (status === 'authorized') {
          effectiveAction = 'authorized';
        } else if (status === 'cancelled') {
          effectiveAction = 'cancelled';
        } else if (status === 'paused') {
          effectiveAction = 'paused';
        } else if (status === 'rejected' || status === 'expired') {
          effectiveAction = 'failed';
        } else {
          logger.warn(
            {
              webhookId: webhook.id,
              preapprovalId,
              rawStatus: details?.status,
            },
            'PreApproval updated webhook with unrecognized status, leaving subscription unchanged'
          );
        }
      }

      // Handle different PreApproval actions (including mapped "updated" events)
      switch (effectiveAction) {
        case 'authorized':
          // Update subscription status to active
          await db
            .update(subscriptions)
            .set({
              status: 'authorized',
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.preapprovalId, preapprovalId));

          // Update user subscription status to active
          await db
            .update(users)
            .set({
              subscriptionStatus: 'active',
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

          logger.info(
            {
              preapprovalId,
              userId,
            },
            'PreApproval authorized successfully'
          );
          break;

        case 'cancelled':
          // Update subscription status to cancelled
          await db
            .update(subscriptions)
            .set({
              status: 'cancelled',
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.preapprovalId, preapprovalId));

          // Downgrade user to pro plan (lowest available plan)
          await this.updateUserSubscription(userId, 'pro');

          // Update user subscription status to cancelled
          await db
            .update(users)
            .set({
              subscriptionStatus: 'cancelled',
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

          logger.info(
            {
              preapprovalId,
              userId,
            },
            'PreApproval cancelled, user downgraded to pro plan'
          );
          break;

        case 'paused':
          // Update subscription status to paused
          await db
            .update(subscriptions)
            .set({
              status: 'paused',
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.preapprovalId, preapprovalId));

          // Update user subscription status to paused
          await db
            .update(users)
            .set({
              subscriptionStatus: 'paused',
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

          logger.info(
            {
              preapprovalId,
              userId,
            },
            'PreApproval paused successfully'
          );
          break;

        case 'failed':
          // Update subscription status to failed
          await db
            .update(subscriptions)
            .set({
              status: 'failed',
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.preapprovalId, preapprovalId));

          // Update user subscription status to cancelled (treat failed as cancelled)
          await db
            .update(users)
            .set({
              subscriptionStatus: 'cancelled',
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

          logger.warn(
            {
              preapprovalId,
              userId,
            },
            'PreApproval failed, user subscription cancelled'
          );
          break;

        default:
          logger.error(
            {
              webhookId: webhook.id,
              action: effectiveAction,
            },
            'PreApproval webhook error: Unknown action'
          );
          throw new Error(`Unknown PreApproval action: ${effectiveAction}`);
      }

      // Log webhook event
      await this.logWebhookEvent(
        webhook.id,
        'preapproval',
        webhook,
        true,
        userId,
        action
      );

      logger.info(
        {
          webhookId: webhook.id,
          preapprovalId,
          userId,
          action: effectiveAction,
        },
        'PreApproval webhook processed successfully'
      );
    } catch (error) {
      logger.error(
        {
          webhookId: webhook.id,
          action: webhook.action,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Error processing PreApproval webhook'
      );

      // Log failed webhook event
      await this.logWebhookEvent(
        webhook.id,
        'preapproval',
        webhook,
        true,
        undefined,
        `${webhook.action}_processing_failed`
      );

      throw error;
    }
  }

  /**
   * Fetch payment details from Mercado Pago API
   */
  private async fetchPaymentDetails(paymentId: string): Promise<any> {
    try {
      logger.info(
        { paymentId },
        'Fetching payment details from Mercado Pago API'
      );

      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => 'Unable to read error response');
        logger.error(
          {
            paymentId,
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText,
          },
          'Payment Gateway error: Failed to fetch payment details from Mercado Pago'
        );
        throw new Error(
          `Failed to fetch payment details: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      logger.info(
        { paymentId },
        'Successfully fetched payment details from Mercado Pago'
      );
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        logger.error(
          {
            paymentId,
            error: error.message,
          },
          'Payment Gateway error: Network error fetching payment details'
        );
        throw new Error(
          `Network error fetching payment details: ${error.message}`
        );
      }
      logger.error(
        {
          paymentId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Payment Gateway error: Failed to fetch payment details'
      );
      throw error;
    }
  }

  /**
   * Fetch PreApproval details from Mercado Pago API
   */
  private async fetchPreApprovalDetails(preapprovalId: string): Promise<any> {
    try {
      logger.info(
        { preapprovalId },
        'Fetching PreApproval details from Mercado Pago API'
      );

      const response = await fetch(
        `https://api.mercadopago.com/preapproval/${preapprovalId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => 'Unable to read error response');
        logger.error(
          {
            preapprovalId,
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText,
          },
          'Payment Gateway error: Failed to fetch PreApproval details from Mercado Pago'
        );
        throw new Error(
          `Failed to fetch PreApproval details: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      logger.info(
        { preapprovalId },
        'Successfully fetched PreApproval details from Mercado Pago'
      );
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        logger.error(
          {
            preapprovalId,
            error: error.message,
          },
          'Payment Gateway error: Network error fetching PreApproval details'
        );
        throw new Error(
          `Network error fetching PreApproval details: ${error.message}`
        );
      }
      logger.error(
        {
          preapprovalId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Payment Gateway error: Failed to fetch PreApproval details'
      );
      throw error;
    }
  }

  /**
   * Update user subscription plan and all usage limits
   */
  private async updateUserSubscription(
    userId: string,
    plan: string
  ): Promise<void> {
    try {
      logger.info({ userId, plan }, 'Updating user subscription plan');

      // Get plan features
      const planFeatures = this.planManager.getFeatures(plan);
      if (!planFeatures) {
        logger.error({ userId, plan }, 'Configuration error: Invalid plan');
        throw new Error(`Invalid plan: ${plan}`);
      }

      // Update user subscription plan
      await db
        .update(users)
        .set({
          subscriptionPlan: plan as 'pro' | 'gold',
          subscriptionStatus: 'active',
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      logger.info(
        {
          userId,
          plan,
          planFeatures,
        },
        'User subscription updated successfully'
      );
    } catch (error) {
      logger.error(
        {
          userId,
          plan,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Database error: Failed to update user subscription'
      );
      throw new Error(
        `Failed to update user subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update billing period in subscriptions table
   */
  private async updateBillingPeriod(
    preapprovalId: string,
    userId: string,
    plan: string
  ): Promise<void> {
    try {
      logger.info({ preapprovalId, userId, plan }, 'Updating billing period');

      const now = new Date();
      const billingPeriodStart = now;

      // Calculate billing period end (1 month from start)
      const billingPeriodEnd = new Date(now);
      billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

      // Check if subscription record exists
      const existing = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.preapprovalId, preapprovalId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing subscription
        await db
          .update(subscriptions)
          .set({
            billingPeriodStart,
            billingPeriodEnd,
            status: 'authorized',
            updatedAt: now,
          })
          .where(eq(subscriptions.preapprovalId, preapprovalId));

        logger.info(
          { preapprovalId },
          'Updated existing subscription billing period'
        );
      } else {
        // Create new subscription record
        await db.insert(subscriptions).values({
          userId,
          preapprovalId,
          plan: plan as 'pro' | 'gold',
          status: 'authorized',
          billingPeriodStart,
          billingPeriodEnd,
        });

        logger.info(
          { preapprovalId },
          'Created new subscription record with billing period'
        );
      }

      logger.info(
        {
          preapprovalId,
          userId,
          plan,
          billingPeriodStart,
          billingPeriodEnd,
        },
        'Billing period updated successfully'
      );
    } catch (error) {
      logger.error(
        {
          preapprovalId,
          userId,
          plan,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Database error: Failed to update billing period'
      );
      throw new Error(
        `Failed to update billing period: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
