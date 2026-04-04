/**
 * MetaAPIClient - HTTP client for the Meta (Facebook) WhatsApp Cloud API.
 *
 * Features:
 *   - Retry with exponential backoff (3 attempts, base 1s)
 *   - Rate-limit (429) handling via Retry-After header
 *   - Circuit breaker to prevent cascading failures
 *   - E.164 phone number normalisation
 */

import type {
  CircuitBreakerState,
  CircuitState,
  MetaApiSendResult,
} from '../types.js';
import logger from '../../utils/logger.js';

const GRAPH_API_VERSION = 'v19.0';
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1_000;

// Circuit breaker thresholds
const CB_FAILURE_THRESHOLD = 5;
const CB_OPEN_DURATION_MS = 30_000; // 30 s cooldown

export class MetaAPIClient {
  private readonly phoneNumberId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly cb: CircuitBreakerState;

  constructor(
    phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    apiKey = process.env.WHATSAPP_API_KEY ?? '',
    baseUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}`
  ) {
    this.phoneNumberId = phoneNumberId;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.cb = {
      state: 'closed',
      failureCount: 0,
      lastFailureAt: null,
      nextAttemptAt: null,
    };
  }

  /** Normalises a phone number to E.164 (+XXXXXXXXXXX) */
  static normalisePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return `+${digits}`;
  }

  /** Exposes circuit breaker state for monitoring. */
  get circuitState(): CircuitState {
    this._maybeResetCircuit();
    return this.cb.state;
  }

  /**
   * Sends a plain text message to a WhatsApp recipient.
   */
  async sendTextMessage(to: string, text: string): Promise<MetaApiSendResult> {
    const normalisedTo = MetaAPIClient.normalisePhone(to).replace('+', '');
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalisedTo,
      type: 'text',
      text: { preview_url: false, body: text },
    };

    return this._sendWithRetry(payload, `sendTextMessage to ${normalisedTo}`);
  }

  /**
   * Sends an OTP verification code via WhatsApp message.
   */
  async sendVerificationCode(
    to: string,
    code: string
  ): Promise<MetaApiSendResult> {
    const text =
      `Tu código de verificación de Power Med es: *${code}*\n\n` +
      `Válido por 10 minutos. No compartas este código con nadie.`;
    return this.sendTextMessage(to, text);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async _sendWithRetry(
    payload: Record<string, unknown>,
    context: string
  ): Promise<MetaApiSendResult> {
    this._maybeResetCircuit();

    if (this.cb.state === 'open') {
      logger.warn({ context }, 'MetaAPIClient: circuit open, request blocked');
      return {
        success: false,
        error: 'Circuit breaker open — Meta API temporarily unavailable',
      };
    }

    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
    let lastError = '';

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            messages?: Array<{ id: string }>;
          };
          const messageId = data.messages?.[0]?.id;
          this._recordSuccess();
          logger.info({ context, messageId }, 'MetaAPIClient: message sent');
          return { success: true, messageId };
        }

        // 429 — rate limited
        if (response.status === 429) {
          const retryAfterSec = Number(
            response.headers.get('Retry-After') ?? '5'
          );
          const waitMs = retryAfterSec * 1_000;
          logger.warn(
            { context, attempt, waitMs },
            'MetaAPIClient: rate limited, waiting'
          );
          await this._sleep(waitMs);
          continue;
        }

        // 4xx errors are not retryable
        if (response.status >= 400 && response.status < 500) {
          const body = await response.text();
          logger.error(
            { context, status: response.status, body },
            'MetaAPIClient: non-retryable error'
          );
          this._recordFailure();
          return { success: false, error: `HTTP ${response.status}: ${body}` };
        }

        // 5xx — retryable
        lastError = `HTTP ${response.status}`;
        this._recordFailure();
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        this._recordFailure();
        logger.warn(
          { context, attempt, error: lastError },
          'MetaAPIClient: network error'
        );
      }

      if (attempt < MAX_RETRIES - 1) {
        await this._sleep(BASE_BACKOFF_MS * Math.pow(2, attempt));
      }
    }

    logger.error(
      { context, lastError },
      'MetaAPIClient: all retries exhausted'
    );
    return { success: false, error: lastError };
  }

  private _maybeResetCircuit(): void {
    if (
      this.cb.state === 'open' &&
      this.cb.nextAttemptAt !== null &&
      Date.now() >= this.cb.nextAttemptAt
    ) {
      this.cb.state = 'half-open';
      logger.info('MetaAPIClient: circuit breaker -> half-open');
    }
  }

  private _recordSuccess(): void {
    if (this.cb.state !== 'closed') {
      logger.info('MetaAPIClient: circuit breaker -> closed');
    }
    this.cb.state = 'closed';
    this.cb.failureCount = 0;
    this.cb.lastFailureAt = null;
    this.cb.nextAttemptAt = null;
  }

  private _recordFailure(): void {
    this.cb.failureCount++;
    this.cb.lastFailureAt = Date.now();

    if (
      this.cb.failureCount >= CB_FAILURE_THRESHOLD &&
      this.cb.state !== 'open'
    ) {
      this.cb.state = 'open';
      this.cb.nextAttemptAt = Date.now() + CB_OPEN_DURATION_MS;
      logger.warn(
        { failures: this.cb.failureCount },
        'MetaAPIClient: circuit breaker -> open'
      );
    }
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
