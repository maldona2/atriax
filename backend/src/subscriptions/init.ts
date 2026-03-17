/**
 * Subscription system initialization
 *
 * This module wires all subscription system components together and provides
 * initialization functions for the main application.
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 17.1
 */

import { loadSubscriptionConfig } from './config/env.js';
import { PlanManager } from './services/PlanManager.js';
import { PaymentGatewayClient } from './services/PaymentGatewayClient.js';
import { CostCalculator } from './services/CostCalculator.js';
import { TokenTracker } from './services/TokenTracker.js';
import { UsageEnforcer } from './services/UsageEnforcer.js';
import { WebhookHandler } from './services/WebhookHandler.js';
import logger from '../utils/logger.js';

/**
 * Initialized subscription system components
 * These are singleton instances used throughout the application
 */
export interface SubscriptionSystemComponents {
  planManager: PlanManager;
  paymentGateway: PaymentGatewayClient;
  costCalculator: CostCalculator;
  tokenTracker: TokenTracker;
  usageEnforcer: UsageEnforcer;
  webhookHandler: WebhookHandler;
}

let components: SubscriptionSystemComponents | null = null;

/**
 * Initialize and validate subscription system configuration
 *
 * This function:
 * 1. Validates environment variables
 * 2. Initializes all subscription system components
 * 3. Loads model pricing data into Cost Calculator
 * 4. Returns initialized components for use in the application
 *
 * @throws {Error} If configuration is invalid or initialization fails
 * @returns Initialized subscription system components
 */
export async function initializeSubscriptionSystem(): Promise<SubscriptionSystemComponents> {
  try {
    logger.info('Starting subscription system initialization');

    // Step 1: Load and validate environment configuration
    logger.info('Step 1: Loading and validating environment configuration');
    const config = loadSubscriptionConfig();

    logger.info(
      {
        hasAccessToken: !!config.MERCADO_PAGO_ACCESS_TOKEN,
        hasPublicKey: !!config.MERCADO_PAGO_PUBLIC_KEY,
        hasWebhookSecret: !!config.MERCADO_PAGO_WEBHOOK_SECRET,
        webhookCallbackUrl: config.WEBHOOK_CALLBACK_URL,
      },
      'Mercado Pago configuration validated successfully'
    );

    // Step 2: Initialize Plan Manager
    logger.info('Step 2: Initializing Plan Manager');
    const planManager = new PlanManager();
    const plans = planManager.getPlans();
    logger.info(
      {
        planCount: plans.length,
        plans: plans.map((p) => p.name),
      },
      'Plan Manager initialized with plan definitions'
    );

    // Step 3: Initialize Payment Gateway Client
    logger.info('Step 3: Initializing Payment Gateway Client');
    const paymentGateway = new PaymentGatewayClient(
      config.MERCADO_PAGO_ACCESS_TOKEN,
      config.MERCADO_PAGO_PUBLIC_KEY
    );
    logger.info(
      'Payment Gateway Client initialized with Mercado Pago credentials'
    );

    // Step 4: Initialize Cost Calculator and load pricing
    logger.info('Step 4: Initializing Cost Calculator');
    const costCalculator = new CostCalculator();
    await costCalculator.loadPricingFromDatabase();
    logger.info('Cost Calculator initialized with model pricing from database');

    // Step 5: Initialize Token Tracker
    logger.info('Step 5: Initializing Token Tracker');
    const tokenTracker = new TokenTracker();
    logger.info('Token Tracker initialized with database connection');

    // Step 6: Initialize Usage Enforcer
    logger.info('Step 6: Initializing Usage Enforcer');
    const usageEnforcer = new UsageEnforcer();
    logger.info(
      'Usage Enforcer initialized with Token Tracker and Cost Calculator'
    );

    // Step 7: Initialize Webhook Handler
    logger.info('Step 7: Initializing Webhook Handler');
    const webhookHandler = new WebhookHandler(
      config.MERCADO_PAGO_WEBHOOK_SECRET,
      config.MERCADO_PAGO_ACCESS_TOKEN
    );
    logger.info('Webhook Handler initialized with webhook secret');

    // Store components as singleton
    components = {
      planManager,
      paymentGateway,
      costCalculator,
      tokenTracker,
      usageEnforcer,
      webhookHandler,
    };

    logger.info('Subscription system initialization completed successfully');

    return components;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to initialize subscription system'
    );
    throw error;
  }
}

/**
 * Get initialized subscription system components
 *
 * @throws {Error} If subscription system has not been initialized
 * @returns Initialized subscription system components
 */
export function getSubscriptionComponents(): SubscriptionSystemComponents {
  if (!components) {
    throw new Error(
      'Subscription system not initialized. Call initializeSubscriptionSystem() first.'
    );
  }
  return components;
}

/**
 * Check if subscription system has been initialized
 *
 * @returns True if initialized, false otherwise
 */
export function isSubscriptionSystemInitialized(): boolean {
  return components !== null;
}
