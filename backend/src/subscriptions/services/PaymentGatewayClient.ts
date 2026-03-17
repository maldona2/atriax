/**
 * Payment Gateway Client - Interfaces with Mercado Pago PreApproval API
 */

import {
  PreApprovalRequest,
  PreApprovalResponse,
  SubscriptionAction,
} from '../models/types.js';
import logger from '../../utils/logger.js';

const MERCADO_PAGO_API_BASE = 'https://api.mercadopago.com';
const API_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Error thrown when Mercado Pago API requests fail
 */
export class MercadoPagoError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'MercadoPagoError';
  }
}

export class PaymentGatewayClient {
  private accessToken: string;
  private publicKey: string;

  constructor(accessToken: string, publicKey: string) {
    this.accessToken = accessToken;
    this.publicKey = publicKey;
  }

  /**
   * Create a PreApproval subscription with Mercado Pago
   */
  async createPreApproval(
    request: PreApprovalRequest
  ): Promise<PreApprovalResponse> {
    try {
      logger.info(
        {
          userId: request.userId,
          plan: request.plan,
          priceARS: request.priceARS,
        },
        'Creating PreApproval subscription with Mercado Pago'
      );

      const externalReference = this.formatExternalReference(
        request.userId,
        request.plan
      );

      const payload = {
        reason: `${request.plan.charAt(0).toUpperCase() + request.plan.slice(1)} Plan Subscription`,
        external_reference: externalReference,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: request.priceARS,
          currency_id: 'ARS',
        },
        back_url: request.callbackUrl,
        payer_email: request.userEmail,
        status: 'pending',
      };

      logger.info(
        {
          userId: request.userId,
          externalReference,
        },
        'Sending PreApproval request to Mercado Pago API'
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      try {
        const response = await fetch(`${MERCADO_PAGO_API_BASE}/preapproval`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          logger.error(
            {
              userId: request.userId,
              plan: request.plan,
              status: response.status,
              statusText: response.statusText,
              errorData,
            },
            'Payment Gateway error: Failed to create PreApproval'
          );

          // Handle specific error cases
          if (response.status === 503) {
            throw new MercadoPagoError(
              'Mercado Pago API is currently unavailable',
              response.status,
              errorData
            );
          }

          throw new MercadoPagoError(
            `Failed to create PreApproval: ${response.statusText}`,
            response.status,
            errorData
          );
        }

        const data = (await response.json()) as {
          id: string;
          init_point: string;
          status: string;
        };

        logger.info(
          {
            userId: request.userId,
            plan: request.plan,
            preApprovalId: data.id,
          },
          'PreApproval created successfully'
        );

        return {
          preApprovalId: data.id,
          initializationUrl: data.init_point,
          status: data.status,
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          logger.error(
            {
              userId: request.userId,
              plan: request.plan,
              timeout: API_TIMEOUT_MS,
            },
            'Payment Gateway error: Request timeout creating PreApproval'
          );
          throw new MercadoPagoError(
            `Request timeout after ${API_TIMEOUT_MS}ms creating PreApproval`
          );
        }
        throw fetchError;
      }
    } catch (error) {
      if (error instanceof MercadoPagoError) {
        throw error;
      }
      logger.error(
        {
          userId: request.userId,
          plan: request.plan,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Payment Gateway error: Network error creating PreApproval'
      );
      throw new MercadoPagoError(
        `Network error creating PreApproval: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(action: SubscriptionAction): Promise<void> {
    try {
      logger.info(
        { preApprovalId: action.preApprovalId },
        'Cancelling subscription with Mercado Pago'
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      try {
        const response = await fetch(
          `${MERCADO_PAGO_API_BASE}/preapproval/${action.preApprovalId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.accessToken}`,
            },
            body: JSON.stringify({
              status: 'cancelled',
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          logger.error(
            {
              preApprovalId: action.preApprovalId,
              status: response.status,
              statusText: response.statusText,
              errorData,
            },
            'Payment Gateway error: Failed to cancel subscription'
          );

          // Handle specific error cases
          if (response.status === 404) {
            throw new MercadoPagoError(
              'Invalid PreApproval ID: Subscription not found',
              response.status,
              errorData
            );
          }

          if (
            response.status === 409 ||
            (errorData &&
              typeof errorData === 'object' &&
              'message' in errorData &&
              typeof errorData.message === 'string' &&
              errorData.message.includes('already cancelled'))
          ) {
            throw new MercadoPagoError(
              'Subscription already cancelled',
              response.status,
              errorData
            );
          }

          if (response.status === 503) {
            throw new MercadoPagoError(
              'Mercado Pago API is currently unavailable',
              response.status,
              errorData
            );
          }

          throw new MercadoPagoError(
            `Failed to cancel subscription: ${response.statusText}`,
            response.status,
            errorData
          );
        }

        logger.info(
          { preApprovalId: action.preApprovalId },
          'Subscription cancelled successfully'
        );
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          logger.error(
            {
              preApprovalId: action.preApprovalId,
              timeout: API_TIMEOUT_MS,
            },
            'Payment Gateway error: Request timeout cancelling subscription'
          );
          throw new MercadoPagoError(
            `Request timeout after ${API_TIMEOUT_MS}ms cancelling subscription`
          );
        }
        throw fetchError;
      }
    } catch (error) {
      if (error instanceof MercadoPagoError) {
        throw error;
      }
      logger.error(
        {
          preApprovalId: action.preApprovalId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Payment Gateway error: Network error cancelling subscription'
      );
      throw new MercadoPagoError(
        `Network error cancelling subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Pause a subscription
   */
  async pauseSubscription(action: SubscriptionAction): Promise<void> {
    try {
      logger.info(
        { preApprovalId: action.preApprovalId },
        'Pausing subscription with Mercado Pago'
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      try {
        const response = await fetch(
          `${MERCADO_PAGO_API_BASE}/preapproval/${action.preApprovalId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.accessToken}`,
            },
            body: JSON.stringify({
              status: 'paused',
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          logger.error(
            {
              preApprovalId: action.preApprovalId,
              status: response.status,
              statusText: response.statusText,
              errorData,
            },
            'Payment Gateway error: Failed to pause subscription'
          );

          if (response.status === 404) {
            throw new MercadoPagoError(
              'Invalid PreApproval ID: Subscription not found',
              response.status,
              errorData
            );
          }

          if (response.status === 503) {
            throw new MercadoPagoError(
              'Mercado Pago API is currently unavailable',
              response.status,
              errorData
            );
          }

          throw new MercadoPagoError(
            `Failed to pause subscription: ${response.statusText}`,
            response.status,
            errorData
          );
        }

        logger.info(
          { preApprovalId: action.preApprovalId },
          'Subscription paused successfully'
        );
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          logger.error(
            {
              preApprovalId: action.preApprovalId,
              timeout: API_TIMEOUT_MS,
            },
            'Payment Gateway error: Request timeout pausing subscription'
          );
          throw new MercadoPagoError(
            `Request timeout after ${API_TIMEOUT_MS}ms pausing subscription`
          );
        }
        throw fetchError;
      }
    } catch (error) {
      if (error instanceof MercadoPagoError) {
        throw error;
      }
      logger.error(
        {
          preApprovalId: action.preApprovalId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Payment Gateway error: Network error pausing subscription'
      );
      throw new MercadoPagoError(
        `Network error pausing subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Resume a paused subscription
   */
  async resumeSubscription(action: SubscriptionAction): Promise<void> {
    try {
      logger.info(
        { preApprovalId: action.preApprovalId },
        'Resuming subscription with Mercado Pago'
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      try {
        const response = await fetch(
          `${MERCADO_PAGO_API_BASE}/preapproval/${action.preApprovalId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.accessToken}`,
            },
            body: JSON.stringify({
              status: 'authorized',
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          logger.error(
            {
              preApprovalId: action.preApprovalId,
              status: response.status,
              statusText: response.statusText,
              errorData,
            },
            'Payment Gateway error: Failed to resume subscription'
          );

          if (response.status === 404) {
            throw new MercadoPagoError(
              'Invalid PreApproval ID: Subscription not found',
              response.status,
              errorData
            );
          }

          if (response.status === 503) {
            throw new MercadoPagoError(
              'Mercado Pago API is currently unavailable',
              response.status,
              errorData
            );
          }

          throw new MercadoPagoError(
            `Failed to resume subscription: ${response.statusText}`,
            response.status,
            errorData
          );
        }

        logger.info(
          { preApprovalId: action.preApprovalId },
          'Subscription resumed successfully'
        );
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          logger.error(
            {
              preApprovalId: action.preApprovalId,
              timeout: API_TIMEOUT_MS,
            },
            'Payment Gateway error: Request timeout resuming subscription'
          );
          throw new MercadoPagoError(
            `Request timeout after ${API_TIMEOUT_MS}ms resuming subscription`
          );
        }
        throw fetchError;
      }
    } catch (error) {
      if (error instanceof MercadoPagoError) {
        throw error;
      }
      logger.error(
        {
          preApprovalId: action.preApprovalId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Payment Gateway error: Network error resuming subscription'
      );
      throw new MercadoPagoError(
        `Network error resuming subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Format external reference for tracking
   * Format: "user:{userId}|plan:{plan}"
   */
  formatExternalReference(userId: string, plan: string): string {
    return `user:${userId}|plan:${plan}`;
  }
}
