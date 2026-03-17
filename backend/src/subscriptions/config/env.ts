/**
 * Environment configuration for Mercado Pago Subscription System
 * Validates required environment variables on startup
 */

import { z } from 'zod';
import logger from '../../utils/logger.js';

const envSchema = z.object({
  // Mercado Pago credentials
  MERCADO_PAGO_ACCESS_TOKEN: z
    .string()
    .min(1, 'Mercado Pago access token is required'),
  MERCADO_PAGO_PUBLIC_KEY: z
    .string()
    .min(1, 'Mercado Pago public key is required'),
  MERCADO_PAGO_WEBHOOK_SECRET: z
    .string()
    .min(1, 'Mercado Pago webhook secret is required'),

  // Webhook configuration
  WEBHOOK_CALLBACK_URL: z
    .string()
    .url('Webhook callback URL must be a valid URL'),

  // Database (already configured in main app, but included for completeness)
  DATABASE_URL: z
    .string()
    .url('Database URL must be a valid connection string'),
});

export type SubscriptionEnvConfig = z.infer<typeof envSchema>;

/**
 * Load and validate subscription system environment configuration
 * @throws {Error} If required environment variables are missing or invalid
 */
export function loadSubscriptionConfig(): SubscriptionEnvConfig {
  try {
    logger.info('Loading subscription system configuration');

    const config = envSchema.parse({
      MERCADO_PAGO_ACCESS_TOKEN: process.env.MERCADO_PAGO_ACCESS_TOKEN,
      MERCADO_PAGO_PUBLIC_KEY: process.env.MERCADO_PAGO_PUBLIC_KEY,
      MERCADO_PAGO_WEBHOOK_SECRET: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
      WEBHOOK_CALLBACK_URL: process.env.WEBHOOK_CALLBACK_URL,
      DATABASE_URL: process.env.DATABASE_URL,
    });

    logger.info('Subscription system configuration loaded successfully');
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      logger.error(
        {
          errors: error.errors,
          missingVars,
        },
        'Configuration error: Missing or invalid environment variables'
      );
      throw new Error(
        `Configuration error: Missing or invalid environment variables:\n${missingVars}`
      );
    }
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Configuration error: Failed to load subscription config'
    );
    throw error;
  }
}

/**
 * Validate configuration without throwing
 * @returns {boolean} True if configuration is valid
 */
export function validateSubscriptionConfig(): boolean {
  try {
    loadSubscriptionConfig();
    return true;
  } catch {
    return false;
  }
}
