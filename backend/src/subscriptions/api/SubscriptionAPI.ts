/**
 * Subscription API Class
 *
 * Provides HTTP endpoints for subscription management with JWT-based authentication.
 * Validates authentication tokens and extracts user IDs from JWT claims.
 *
 * Requirements: 12.7, 12.8
 */

import { Router, Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { authenticate } from '../../middleware/auth.js';
import type { AuthUser } from '../../middleware/auth.js';
import {
  CreateSubscriptionRequest,
  SubscriptionStatusResponse,
  PlanName,
  PaymentWebhook,
  PreApprovalWebhook,
} from '../models/types.js';
import { PlanManager } from '../services/PlanManager.js';
import { PaymentGatewayClient } from '../services/PaymentGatewayClient.js';
import { WebhookHandler } from '../services/WebhookHandler.js';
import { loadSubscriptionConfig } from '../config/env.js';
import { db, users, subscriptions } from '../../db/client.js';
import logger from '../../utils/logger.js';

/**
 * SubscriptionAPI class manages subscription-related HTTP endpoints
 * with JWT-based authentication middleware.
 */
export class SubscriptionAPI {
  private router: Router;
  private planManager: PlanManager;
  private paymentGateway: PaymentGatewayClient;
  private webhookHandler: WebhookHandler;
  private config: ReturnType<typeof loadSubscriptionConfig>;

  constructor() {
    this.router = Router();
    this.config = loadSubscriptionConfig();
    this.planManager = new PlanManager();
    this.paymentGateway = new PaymentGatewayClient(
      this.config.MERCADO_PAGO_ACCESS_TOKEN,
      this.config.MERCADO_PAGO_PUBLIC_KEY
    );
    this.webhookHandler = new WebhookHandler(
      this.config.MERCADO_PAGO_WEBHOOK_SECRET,
      this.config.MERCADO_PAGO_ACCESS_TOKEN
    );
    this.setupRoutes();
  }

  /**
   * Get the Express router with all configured routes
   */
  public getRouter(): Router {
    return this.router;
  }

  /**
   * Set up all subscription API routes with authentication middleware
   */
  private setupRoutes(): void {
    // Apply authentication middleware to all routes except webhooks
    // Webhooks use signature validation instead of JWT authentication
    this.router.use(
      /^(?!\/webhooks)/,
      this.authenticationMiddleware.bind(this)
    );

    // Subscription management endpoints (authenticated)
    this.router.post('/', this.createSubscription.bind(this));
    this.router.get('/plans', this.getAvailablePlans.bind(this)); // Must be before /:userId
    this.router.delete('/:userId', this.cancelSubscription.bind(this));
    this.router.post('/:userId/pause', this.pauseSubscription.bind(this));
    this.router.post('/:userId/resume', this.resumeSubscription.bind(this));
    this.router.get('/:userId', this.getSubscriptionStatus.bind(this));

    // Webhook endpoints (no JWT authentication, use signature validation)
    this.router.post('/webhooks', this.handleUnifiedWebhook.bind(this));
    this.router.post('/webhooks/payment', this.handlePaymentWebhook.bind(this));
    this.router.post(
      '/webhooks/preapproval',
      this.handlePreApprovalWebhook.bind(this)
    );
  }

  /**
   * POST /webhooks
   * Unified webhook entrypoint used by Mercado Pago
   * Dispatches to the specific handler based on payload.type
   */
  private async handleUnifiedWebhook(
    req: Request,
    res: Response
  ): Promise<void> {
    const payload = req.body as { type?: string } | undefined;

    if (
      !payload ||
      typeof payload !== 'object' ||
      typeof payload.type !== 'string'
    ) {
      logger.warn(
        {
          payload,
          timestamp: new Date().toISOString(),
        },
        'Unified webhook called with invalid payload'
      );
      res.status(400).json({ error: 'Invalid payload structure' });
      return;
    }

    // Mercado Pago sends `type` values such as:
    // - "payment"
    // - "subscription_preapproval"   (for subscription preapprovals)
    if (payload.type === 'payment') {
      await this.handlePaymentWebhook(req, res);
      return;
    }

    if (
      payload.type === 'preapproval' ||
      payload.type === 'subscription_preapproval'
    ) {
      await this.handlePreApprovalWebhook(req, res);
      return;
    }

    logger.warn(
      {
        type: payload.type,
        timestamp: new Date().toISOString(),
      },
      'Unified webhook received unsupported type'
    );
    res.status(400).json({ error: 'Unsupported webhook type' });
  }

  /**
   * Authentication middleware that validates JWT tokens and extracts user ID
   * Returns 401 Unauthorized for invalid or missing tokens
   *
   * Requirements: 12.7, 12.8
   */
  private authenticationMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    authenticate(req, res, next);
  }

  /**
   * POST /subscriptions
   * Create a new subscription for a user
   * Requirements: 12.1
   */
  private async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = req.user as AuthUser;
      const { plan } = req.body as { plan: PlanName };

      logger.info(
        { userId: authenticatedUser.id, plan },
        'Creating subscription'
      );

      // Validate plan
      if (!plan || (plan !== 'pro' && plan !== 'gold')) {
        logger.warn(
          { userId: authenticatedUser.id, plan },
          'Invalid plan requested'
        );
        res.status(400).json({
          error: 'Invalid plan. Must be "pro" or "gold"',
        });
        return;
      }

      // Check if plan is disabled
      if (this.planManager.isDisabled(plan)) {
        logger.warn(
          { userId: authenticatedUser.id, plan },
          'Disabled plan requested'
        );
        res.status(400).json({
          error: 'This plan is not available yet',
        });
        return;
      }

      // Get plan details
      const planDetails = this.planManager.getPlan(plan);
      if (!planDetails) {
        logger.error(
          { userId: authenticatedUser.id, plan },
          'Configuration error: Plan not found'
        );
        res.status(400).json({ error: 'Plan not found' });
        return;
      }

      // Get user email from database
      const [user] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, authenticatedUser.id))
        .limit(1);

      if (!user) {
        logger.error(
          { userId: authenticatedUser.id },
          'User not found in database'
        );
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Create PreApproval with Mercado Pago
      const preApprovalResponse = await this.paymentGateway.createPreApproval({
        userId: authenticatedUser.id,
        plan,
        priceARS: planDetails.priceARS,
        frequency: 'monthly',
        callbackUrl: this.config.WEBHOOK_CALLBACK_URL,
        userEmail: user.email,
      });

      // Store subscription in database
      const now = new Date();
      const billingPeriodEnd = new Date(now);
      billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

      await db.insert(subscriptions).values({
        userId: authenticatedUser.id,
        preapprovalId: preApprovalResponse.preApprovalId,
        plan,
        status: 'authorized',
        billingPeriodStart: now,
        billingPeriodEnd,
      });

      logger.info(
        {
          userId: authenticatedUser.id,
          plan,
          preApprovalId: preApprovalResponse.preApprovalId,
        },
        'Subscription created successfully'
      );

      res.status(201).json({
        preApprovalId: preApprovalResponse.preApprovalId,
        initializationUrl: preApprovalResponse.initializationUrl,
        status: preApprovalResponse.status,
      });
    } catch (error) {
      const authenticatedUser = req.user as AuthUser;
      logger.error(
        {
          userId: authenticatedUser?.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Error creating subscription'
      );

      // Handle specific Payment Gateway errors
      if (error instanceof Error && error.name === 'MercadoPagoError') {
        const mpError = error as any;
        if (mpError.statusCode === 503) {
          res.status(503).json({
            error:
              'Payment service temporarily unavailable. Please try again later.',
          });
          return;
        }
        if (mpError.statusCode === 504 || error.message.includes('timeout')) {
          res.status(504).json({
            error: 'Payment service request timeout. Please try again.',
          });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * DELETE /subscriptions/:userId
   * Cancel an existing subscription
   * Requirements: 12.2
   */
  private async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const authenticatedUser = req.user as AuthUser;

      logger.info(
        { userId, authenticatedUserId: authenticatedUser.id },
        'Cancelling subscription'
      );

      // Authorization check: users can only cancel their own subscriptions
      if (authenticatedUser.id !== userId) {
        logger.warn(
          {
            authenticatedUserId: authenticatedUser.id,
            requestedUserId: userId,
          },
          "Authorization error: User attempted to cancel another user's subscription"
        );
        res.status(403).json({
          error: "Forbidden: Cannot cancel another user's subscription",
        });
        return;
      }

      // Get user's active subscription
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      if (!subscription) {
        logger.warn({ userId }, 'Subscription not found for cancellation');
        res.status(404).json({ error: 'No active subscription found' });
        return;
      }

      if (subscription.status === 'cancelled') {
        logger.warn(
          { userId, preApprovalId: subscription.preapprovalId },
          'Subscription already cancelled'
        );
        res.status(409).json({ error: 'Subscription already cancelled' });
        return;
      }

      // Cancel with Mercado Pago
      await this.paymentGateway.cancelSubscription({
        preApprovalId: subscription.preapprovalId,
      });

      // Update subscription status in database
      await db
        .update(subscriptions)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));

      logger.info(
        {
          userId,
          preApprovalId: subscription.preapprovalId,
        },
        'Subscription cancelled successfully'
      );

      res.status(200).json({ message: 'Subscription cancelled successfully' });
    } catch (error) {
      const { userId } = req.params;
      logger.error(
        {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Error cancelling subscription'
      );

      // Handle specific Payment Gateway errors
      if (error instanceof Error && error.name === 'MercadoPagoError') {
        const mpError = error as any;
        if (mpError.statusCode === 404) {
          res
            .status(404)
            .json({ error: 'Subscription not found in payment gateway' });
          return;
        }
        if (
          mpError.statusCode === 409 ||
          mpError.message.includes('already cancelled')
        ) {
          res.status(409).json({ error: 'Subscription already cancelled' });
          return;
        }
        if (mpError.statusCode === 503) {
          res.status(503).json({
            error:
              'Payment service temporarily unavailable. Please try again later.',
          });
          return;
        }
        if (mpError.statusCode === 504 || error.message.includes('timeout')) {
          res.status(504).json({
            error: 'Payment service request timeout. Please try again.',
          });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /subscriptions/:userId/pause
   * Pause a subscription
   * Requirements: 12.3
   */
  private async pauseSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const authenticatedUser = req.user as AuthUser;

      logger.info(
        { userId, authenticatedUserId: authenticatedUser.id },
        'Pausing subscription'
      );

      // Authorization check
      if (authenticatedUser.id !== userId) {
        logger.warn(
          {
            authenticatedUserId: authenticatedUser.id,
            requestedUserId: userId,
          },
          "Authorization error: User attempted to pause another user's subscription"
        );
        res.status(403).json({
          error: "Forbidden: Cannot pause another user's subscription",
        });
        return;
      }

      // Get user's active subscription
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      if (!subscription) {
        logger.warn({ userId }, 'Subscription not found for pausing');
        res.status(404).json({ error: 'No active subscription found' });
        return;
      }

      if (subscription.status === 'paused') {
        logger.warn(
          { userId, preApprovalId: subscription.preapprovalId },
          'Subscription already paused'
        );
        res.status(409).json({ error: 'Subscription already paused' });
        return;
      }

      if (subscription.status === 'cancelled') {
        logger.warn(
          { userId, preApprovalId: subscription.preapprovalId },
          'Cannot pause cancelled subscription'
        );
        res
          .status(409)
          .json({ error: 'Cannot pause a cancelled subscription' });
        return;
      }

      // Pause with Mercado Pago
      await this.paymentGateway.pauseSubscription({
        preApprovalId: subscription.preapprovalId,
      });

      // Update subscription status in database
      await db
        .update(subscriptions)
        .set({
          status: 'paused',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));

      logger.info(
        {
          userId,
          preApprovalId: subscription.preapprovalId,
        },
        'Subscription paused successfully'
      );

      res.status(200).json({ message: 'Subscription paused successfully' });
    } catch (error) {
      const { userId } = req.params;
      logger.error(
        {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Error pausing subscription'
      );

      // Handle specific Payment Gateway errors
      if (error instanceof Error && error.name === 'MercadoPagoError') {
        const mpError = error as any;
        if (mpError.statusCode === 404) {
          res
            .status(404)
            .json({ error: 'Subscription not found in payment gateway' });
          return;
        }
        if (mpError.statusCode === 503) {
          res.status(503).json({
            error:
              'Payment service temporarily unavailable. Please try again later.',
          });
          return;
        }
        if (mpError.statusCode === 504 || error.message.includes('timeout')) {
          res.status(504).json({
            error: 'Payment service request timeout. Please try again.',
          });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /subscriptions/:userId/resume
   * Resume a paused subscription
   * Requirements: 12.4
   */
  private async resumeSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const authenticatedUser = req.user as AuthUser;

      logger.info(
        { userId, authenticatedUserId: authenticatedUser.id },
        'Resuming subscription'
      );

      // Authorization check
      if (authenticatedUser.id !== userId) {
        logger.warn(
          {
            authenticatedUserId: authenticatedUser.id,
            requestedUserId: userId,
          },
          "Authorization error: User attempted to resume another user's subscription"
        );
        res.status(403).json({
          error: "Forbidden: Cannot resume another user's subscription",
        });
        return;
      }

      // Get user's subscription
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      if (!subscription) {
        logger.warn({ userId }, 'Subscription not found for resuming');
        res.status(404).json({ error: 'No subscription found' });
        return;
      }

      if (subscription.status === 'authorized') {
        logger.warn(
          { userId, preApprovalId: subscription.preapprovalId },
          'Subscription already active'
        );
        res.status(409).json({ error: 'Subscription is already active' });
        return;
      }

      if (subscription.status === 'cancelled') {
        logger.warn(
          { userId, preApprovalId: subscription.preapprovalId },
          'Cannot resume cancelled subscription'
        );
        res
          .status(409)
          .json({ error: 'Cannot resume a cancelled subscription' });
        return;
      }

      // Resume with Mercado Pago
      await this.paymentGateway.resumeSubscription({
        preApprovalId: subscription.preapprovalId,
      });

      // Update subscription status in database
      await db
        .update(subscriptions)
        .set({
          status: 'authorized',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));

      logger.info(
        {
          userId,
          preApprovalId: subscription.preapprovalId,
        },
        'Subscription resumed successfully'
      );

      res.status(200).json({ message: 'Subscription resumed successfully' });
    } catch (error) {
      const { userId } = req.params;
      logger.error(
        {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Error resuming subscription'
      );

      // Handle specific Payment Gateway errors
      if (error instanceof Error && error.name === 'MercadoPagoError') {
        const mpError = error as any;
        if (mpError.statusCode === 404) {
          res
            .status(404)
            .json({ error: 'Subscription not found in payment gateway' });
          return;
        }
        if (mpError.statusCode === 503) {
          res.status(503).json({
            error:
              'Payment service temporarily unavailable. Please try again later.',
          });
          return;
        }
        if (mpError.statusCode === 504 || error.message.includes('timeout')) {
          res.status(504).json({
            error: 'Payment service request timeout. Please try again.',
          });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /subscriptions/:userId
   * Get subscription status for a user
   * Requirements: 12.5
   */
  private async getSubscriptionStatus(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.params.userId;

      if (!userId) {
        logger.warn('Get subscription status called without userId');
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      logger.info({ userId }, 'Getting subscription status');

      // Get subscription from database
      const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      if (subscription.length === 0) {
        logger.warn({ userId }, 'Subscription not found');
        res.status(404).json({ error: 'Subscription not found' });
        return;
      }

      const sub = subscription[0];

      // Get plan details from PlanManager
      const planDetails = this.planManager.getPlan(sub.plan);
      if (!planDetails) {
        logger.error(
          { userId, plan: sub.plan },
          'Plan not found in PlanManager'
        );
        res.status(500).json({ error: 'Plan configuration error' });
        return;
      }

      // Get current usage from user record
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        logger.warn({ userId }, 'User not found');
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const userData = user[0];

      // Return subscription status with usage
      logger.info(
        { userId, plan: sub.plan, status: sub.status },
        'Subscription status retrieved successfully'
      );

      res.json({
        userId: sub.userId,
        plan: sub.plan,
        status: sub.status,
        preApprovalId: sub.preapprovalId,
        billingPeriodStart: sub.billingPeriodStart
          ? sub.billingPeriodStart.toISOString()
          : null,
        features: planDetails.features,
      });
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Error getting subscription status'
      );
      res.status(500).json({ error: 'Failed to get subscription status' });
    }
  }

  /**
   * GET /plans
   * Get available subscription plans
   * Requirements: 12.6
   */
  private async getAvailablePlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = this.planManager.getPlans();

      // Transform plans to include displayName for frontend
      const plansWithDisplayName = plans.map((plan) => ({
        name: plan.name,
        displayName: plan.name === 'pro' ? 'Profesional' : 'Gold',
        priceARS: plan.priceARS,
        features: plan.features,
        disabled: plan.disabled || false,
      }));

      res.status(200).json(plansWithDisplayName);
    } catch (error) {
      logger.error({ error }, 'Error getting available plans');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /webhooks/payment
   * Handle payment webhooks from Mercado Pago
   * Note: This endpoint does not use JWT authentication, uses signature validation instead
   * Requirements: 13.1, 13.2, 13.4, 13.5, 13.6
   */
  private async handlePaymentWebhook(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Validate payload structure
      const webhook = req.body;

      if (!this.isValidPaymentWebhook(webhook)) {
        logger.warn(
          {
            payload: webhook,
            timestamp: new Date().toISOString(),
          },
          'Invalid payment webhook payload structure'
        );
        res.status(400).json({ error: 'Invalid payload structure' });
        return;
      }

      // Validate webhook signature
      const signatureHeader = req.headers['x-signature'] as string;
      const requestId = req.headers['x-request-id'] as string | undefined;

      if (!signatureHeader) {
        logger.warn(
          {
            webhookId: webhook.id,
            timestamp: new Date().toISOString(),
          },
          'Missing webhook signature'
        );
        res.status(400).json({ error: 'Missing signature' });
        return;
      }

      const isValidSignature = this.webhookHandler.validateWebhook(
        signatureHeader,
        webhook.id,
        requestId
      );

      if (!isValidSignature) {
        logger.error(
          {
            webhookId: webhook.id,
            timestamp: new Date().toISOString(),
          },
          'Invalid webhook signature - security event'
        );
        res.status(400).json({ error: 'Invalid signature' });
        return;
      }

      // Process webhook
      await this.webhookHandler.handlePaymentWebhook(webhook);

      logger.info(
        {
          webhookId: webhook.id,
          timestamp: new Date().toISOString(),
        },
        'Payment webhook processed successfully'
      );

      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        'Error processing payment webhook'
      );

      // Return 200 to prevent Mercado Pago retries for processing errors
      res.status(200).json({ message: 'Webhook received' });
    }
  }

  /**
   * POST /webhooks/preapproval
   * Handle PreApproval webhooks from Mercado Pago
   * Note: This endpoint does not use JWT authentication, uses signature validation instead
   * Requirements: 13.1, 13.2, 13.4, 13.5, 13.6
   */
  private async handlePreApprovalWebhook(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Validate payload structure
      const webhook = req.body;

      if (!this.isValidPreApprovalWebhook(webhook)) {
        logger.warn(
          {
            payload: webhook,
            timestamp: new Date().toISOString(),
          },
          'Invalid PreApproval webhook payload structure'
        );
        res.status(400).json({ error: 'Invalid payload structure' });
        return;
      }

      // Validate webhook signature
      const signatureHeader = req.headers['x-signature'] as string;
      const requestId = req.headers['x-request-id'] as string | undefined;

      if (!signatureHeader) {
        logger.warn(
          {
            webhookId: webhook.id,
            timestamp: new Date().toISOString(),
          },
          'Missing webhook signature'
        );
        res.status(400).json({ error: 'Missing signature' });
        return;
      }

      const isValidSignature = this.webhookHandler.validateWebhook(
        signatureHeader,
        webhook.id,
        requestId
      );

      if (!isValidSignature) {
        logger.error(
          {
            webhookId: webhook.id,
            timestamp: new Date().toISOString(),
          },
          'Invalid webhook signature - security event'
        );
        res.status(400).json({ error: 'Invalid signature' });
        return;
      }

      // Process webhook
      await this.webhookHandler.handlePreApprovalWebhook(webhook);

      logger.info(
        {
          webhookId: webhook.id,
          action: webhook.action,
          timestamp: new Date().toISOString(),
        },
        'PreApproval webhook processed successfully'
      );

      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        'Error processing PreApproval webhook'
      );

      // Return 200 to prevent Mercado Pago retries for processing errors
      res.status(200).json({ message: 'Webhook received' });
    }
  }

  /**
   * Validate payment webhook payload structure
   */
  private isValidPaymentWebhook(payload: any): payload is PaymentWebhook {
    return (
      payload &&
      typeof payload === 'object' &&
      typeof payload.id === 'string' &&
      payload.type === 'payment' &&
      payload.data &&
      typeof payload.data === 'object' &&
      typeof payload.data.id === 'string'
    );
  }

  /**
   * Validate PreApproval webhook payload structure
   */
  private isValidPreApprovalWebhook(
    payload: any
  ): payload is PreApprovalWebhook {
    const validActions = [
      'authorized',
      'cancelled',
      'paused',
      'failed',
      'updated',
    ];
    return (
      payload &&
      typeof payload === 'object' &&
      typeof payload.id === 'string' &&
      (payload.type === 'preapproval' ||
        payload.type === 'subscription_preapproval') &&
      typeof payload.action === 'string' &&
      validActions.includes(payload.action) &&
      payload.data &&
      typeof payload.data === 'object' &&
      typeof payload.data.id === 'string'
    );
  }
}
