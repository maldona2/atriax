import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requireEnterprisePlan } from '../middleware/requireEnterprisePlan.js';
import { ChatbotService } from './services/ChatbotService.js';
import logger from '../utils/logger.js';

const router = Router();
const chatbotService = new ChatbotService();

const RATE_LIMIT_PER_MINUTE =
  Number(process.env.CHATBOT_RATE_LIMIT_PER_MINUTE) || 20;

const chatbotRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user?.id ?? req.ip) as string,
  message: {
    error: {
      message: `Demasiadas solicitudes. Máximo ${RATE_LIMIT_PER_MINUTE} mensajes por minuto.`,
    },
  },
});

const contextSchema = z
  .object({
    lastPatientId: z.string().optional(),
    lastAppointmentId: z.string().optional(),
    pendingIntent: z.record(z.unknown()).optional(),
    pendingConfirmation: z.record(z.unknown()).optional(),
    pendingDisambiguation: z.record(z.unknown()).optional(),
    accumulatedParams: z.record(z.unknown()).optional(),
    pendingField: z.string().optional(),
  })
  .default({});

const messageSchema = z.object({
  message: z.string().min(1).max(1000),
  context: contextSchema,
});

const featureEnabled =
  (process.env.FEATURE_CHATBOT_ENABLED ?? 'true').toLowerCase() !== 'false';

/**
 * POST /api/chatbot/message
 * Processes a user message and returns an AI response.
 */
router.post(
  '/message',
  (req: Request, res: Response, next: NextFunction) => {
    if (!featureEnabled) {
      const err = new Error('Chatbot feature is not available');
      (err as Error & { statusCode?: number }).statusCode = 404;
      return next(err);
    }
    next();
  },
  authenticate,
  requireEnterprisePlan,
  chatbotRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = messageSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error(
          'Mensaje inválido: ' + parsed.error.issues[0]?.message
        );
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }

      const { message, context: rawContext } = parsed.data;
      const context = rawContext as import('./types.js').ConversationContext;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      if (!tenantId) {
        const err = new Error('Forbidden');
        (err as Error & { statusCode?: number }).statusCode = 403;
        return next(err);
      }

      const response = await chatbotService.processMessage(
        { message, context },
        tenantId,
        userId
      );

      logger.info(
        { userId, tenantId, messageLength: message.length },
        'Chatbot message processed'
      );

      res.json(response);
    } catch (err) {
      logger.error({ err }, 'Chatbot route error');
      next(err);
    }
  }
);

export default router;
