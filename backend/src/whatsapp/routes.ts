/**
 * WhatsApp notification routes.
 *
 * GET  /api/whatsapp/webhook  — Meta webhook verification challenge
 * POST /api/whatsapp/webhook  — Inbound patient replies (keyword matching only)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { WebhookValidator } from './services/WebhookValidator.js';
import { whatsAppReplyHandler } from './services/WhatsAppReplyHandler.js';
import type { MetaWebhookPayload } from './types.js';
import logger from '../utils/logger.js';

const router = Router();
const webhookValidator = new WebhookValidator();

const featureEnabled =
  (process.env.FEATURE_WHATSAPP_ENABLED ?? 'true').toLowerCase() !== 'false';

function assertFeatureEnabled(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!featureEnabled) {
    const err = new Error('WhatsApp feature is not available');
    (err as Error & { statusCode?: number }).statusCode = 404;
    next(err);
    return;
  }
  next();
}

// ─── GET /api/whatsapp/webhook — Meta verification challenge ──────────────────

router.get('/webhook', assertFeatureEnabled, (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  const result = webhookValidator.validateChallenge(mode, token, challenge);
  if (result !== null) {
    res.status(200).send(result);
    return;
  }

  res.status(403).json({ error: 'Forbidden' });
});

// ─── POST /api/whatsapp/webhook — Inbound patient replies ────────────────────

router.post(
  '/webhook',
  assertFeatureEnabled,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBody: Buffer =
        (req as unknown as Record<string, unknown>)['rawBody'] instanceof Buffer
          ? ((req as unknown as Record<string, unknown>)['rawBody'] as Buffer)
          : Buffer.isBuffer(req.body)
            ? req.body
            : Buffer.from(JSON.stringify(req.body));
      const signature = req.headers['x-hub-signature-256'] as
        | string
        | undefined;

      if (!webhookValidator.validateSignature(rawBody, signature)) {
        logger.warn({ ip: req.ip }, 'WhatsApp webhook: invalid signature');
        res.status(403).json({ error: 'Invalid signature' });
        return;
      }

      const payload: MetaWebhookPayload = Buffer.isBuffer(req.body)
        ? JSON.parse(req.body.toString())
        : req.body;

      if (payload.object !== 'whatsapp_business_account') {
        res.status(200).json({ status: 'ignored' });
        return;
      }

      // Validate that the payload targets our registered phone number
      const expectedPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
      const phoneNumberId =
        payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
      if (phoneNumberId && phoneNumberId !== expectedPhoneNumberId) {
        res.status(200).json({ status: 'ignored' });
        return;
      }

      // Process each inbound text message asynchronously — always return 200 to Meta
      const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
      for (const msg of messages) {
        if (msg.type !== 'text' || !msg.text?.body) continue;
        whatsAppReplyHandler
          .handle('', msg.from, msg.text.body)
          .catch((err) => {
            logger.error(
              { err, from: msg.from },
              'WhatsApp webhook: reply handler error'
            );
          });
      }

      res.status(200).json({ status: 'ok' });
    } catch (err) {
      logger.error({ err }, 'WhatsApp webhook route error');
      next(err);
    }
  }
);

export default router;
