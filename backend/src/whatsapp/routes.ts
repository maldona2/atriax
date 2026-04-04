/**
 * WhatsApp Bot API routes.
 *
 * GET  /api/whatsapp/webhook  — Meta webhook verification challenge
 * POST /api/whatsapp/webhook  — Incoming messages from Meta
 * POST /api/whatsapp/verify-phone   — Initiate phone OTP verification (authenticated)
 * POST /api/whatsapp/confirm-phone  — Confirm OTP (authenticated)
 * GET  /api/whatsapp/phone-status   — Check if user has a verified phone (authenticated)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requireEnterprisePlan } from '../middleware/requireEnterprisePlan.js';
import { WebhookValidator } from './services/WebhookValidator.js';
import { WhatsAppService } from './services/WhatsAppService.js';
import { PhoneVerifier } from './services/PhoneVerifier.js';
import type { MetaWebhookPayload } from './types.js';
import logger from '../utils/logger.js';

const router = Router();
const webhookValidator = new WebhookValidator();
const whatsappService = new WhatsAppService();
const phoneVerifier = new PhoneVerifier();

const featureEnabled =
  (process.env.FEATURE_WHATSAPP_ENABLED ?? 'true').toLowerCase() !== 'false';

function assertFeatureEnabled(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!featureEnabled) {
    const err = new Error('WhatsApp bot feature is not available');
    (err as Error & { statusCode?: number }).statusCode = 404;
    next(err);
    return;
  }
  next();
}

const verifyPhoneSchema = z.object({
  phoneNumber: z.string().min(7).max(20),
});

const confirmPhoneSchema = z.object({
  phoneNumber: z.string().min(7).max(20),
  otp: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});

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

// ─── POST /api/whatsapp/webhook — Incoming messages ──────────────────────────

// Raw body is needed for HMAC signature validation.
// Express must mount this route with express.raw() or the raw body stored in req.rawBody.
// We pass req.body (Buffer when using express.raw) to the validator.
router.post(
  '/webhook',
  assertFeatureEnabled,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBody: Buffer = Buffer.isBuffer(req.body)
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

      // Identify which tenant this webhook belongs to.
      // The phone_number_id in the payload maps to the tenant that registered it.
      // For now we resolve tenantId from the WHATSAPP_PHONE_NUMBER_ID env var
      // (single-tenant mode). Multi-tenant phone routing can be added later.
      const expectedPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
      const tenantId = process.env.WHATSAPP_DEFAULT_TENANT_ID ?? '';
      const userId = process.env.WHATSAPP_DEFAULT_USER_ID ?? '';

      if (!tenantId || !userId) {
        logger.error(
          'WhatsApp webhook: WHATSAPP_DEFAULT_TENANT_ID or WHATSAPP_DEFAULT_USER_ID not configured'
        );
        // Return 200 to prevent Meta from retrying
        res.status(200).json({ status: 'configuration_error' });
        return;
      }

      // Validate that the payload targets our registered phone number
      const phoneNumberId =
        payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
      if (phoneNumberId && phoneNumberId !== expectedPhoneNumberId) {
        res.status(200).json({ status: 'ignored' });
        return;
      }

      // Process asynchronously — always respond 200 to Meta immediately
      whatsappService
        .handleWebhookPayload(payload, tenantId, userId)
        .catch((err) => {
          logger.error({ err }, 'WhatsApp webhook: async processing error');
        });

      res.status(200).json({ status: 'ok' });
    } catch (err) {
      logger.error({ err }, 'WhatsApp webhook route error');
      next(err);
    }
  }
);

// ─── POST /api/whatsapp/verify-phone ─────────────────────────────────────────

router.post(
  '/verify-phone',
  assertFeatureEnabled,
  authenticate,
  requireEnterprisePlan,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = verifyPhoneSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error(
          'Número de teléfono inválido: ' + parsed.error.issues[0]?.message
        );
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }

      const { phoneNumber } = parsed.data;
      const tenantId = req.user!.tenantId!;
      const userId = req.user!.id;

      const result = await phoneVerifier.initiateVerification(
        tenantId,
        userId,
        phoneNumber
      );
      res.status(result.success ? 200 : 422).json(result);
    } catch (err) {
      logger.error({ err }, 'WhatsApp verify-phone route error');
      next(err);
    }
  }
);

// ─── POST /api/whatsapp/confirm-phone ────────────────────────────────────────

router.post(
  '/confirm-phone',
  assertFeatureEnabled,
  authenticate,
  requireEnterprisePlan,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = confirmPhoneSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error(
          'Datos inválidos: ' + parsed.error.issues[0]?.message
        );
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }

      const { phoneNumber, otp } = parsed.data;
      const userId = req.user!.id;

      const result = await phoneVerifier.confirmVerification(
        userId,
        phoneNumber,
        otp
      );
      res.status(result.success ? 200 : 422).json(result);
    } catch (err) {
      logger.error({ err }, 'WhatsApp confirm-phone route error');
      next(err);
    }
  }
);

// ─── GET /api/whatsapp/phone-status ──────────────────────────────────────────

router.get(
  '/phone-status',
  assertFeatureEnabled,
  authenticate,
  requireEnterprisePlan,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const phone = await phoneVerifier.getVerifiedPhone(userId);
      res.json({ verified: phone !== null, phoneNumber: phone });
    } catch (err) {
      logger.error({ err }, 'WhatsApp phone-status route error');
      next(err);
    }
  }
);

export default router;
