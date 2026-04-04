/**
 * WebhookValidator - Validates incoming Meta webhook requests.
 *
 * Implements:
 *   - Webhook verification challenge (GET)
 *   - Payload signature validation via HMAC-SHA256 (POST)
 */

import { createHmac, timingSafeEqual } from 'crypto';
import logger from '../../utils/logger.js';

export class WebhookValidator {
  private readonly appSecret: string;
  private readonly verifyToken: string;

  constructor(
    appSecret = process.env.WHATSAPP_APP_SECRET ?? '',
    verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? ''
  ) {
    this.appSecret = appSecret;
    this.verifyToken = verifyToken;
  }

  /**
   * Validates the webhook verification challenge sent by Meta during registration.
   * Returns the hub.challenge value if the token matches, null otherwise.
   */
  validateChallenge(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined
  ): string | null {
    if (mode === 'subscribe' && token === this.verifyToken && challenge) {
      logger.info('WhatsApp webhook verification challenge accepted');
      return challenge;
    }

    logger.warn(
      { mode, tokenMatch: token === this.verifyToken },
      'WhatsApp webhook verification challenge rejected'
    );
    return null;
  }

  /**
   * Validates the X-Hub-Signature-256 header on incoming POST webhook payloads.
   * Meta signs the raw body with the app secret using HMAC-SHA256.
   */
  validateSignature(
    rawBody: Buffer,
    signatureHeader: string | undefined
  ): boolean {
    if (!signatureHeader) {
      logger.warn('WhatsApp webhook: missing X-Hub-Signature-256 header');
      return false;
    }

    if (!signatureHeader.startsWith('sha256=')) {
      logger.warn(
        { signatureHeader },
        'WhatsApp webhook: malformed signature header'
      );
      return false;
    }

    const receivedHex = signatureHeader.slice('sha256='.length);
    const expectedHex = createHmac('sha256', this.appSecret)
      .update(rawBody)
      .digest('hex');

    try {
      const receivedBuf = Buffer.from(receivedHex, 'hex');
      const expectedBuf = Buffer.from(expectedHex, 'hex');

      if (receivedBuf.length !== expectedBuf.length) {
        logger.warn('WhatsApp webhook: signature length mismatch');
        return false;
      }

      const valid = timingSafeEqual(receivedBuf, expectedBuf);
      if (!valid) {
        logger.warn(
          'WhatsApp webhook: signature mismatch — possible tampering'
        );
      }
      return valid;
    } catch {
      logger.warn('WhatsApp webhook: signature comparison failed');
      return false;
    }
  }
}
