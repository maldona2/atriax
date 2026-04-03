import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db, users } from '../db/client.js';
import logger from '../utils/logger.js';

/**
 * Middleware that enforces Enterprise (gold) plan access.
 * Users must have subscriptionPlan='gold' and subscriptionStatus='active'.
 */
export const requireEnterprisePlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    const err = new Error('No autenticado');
    (err as Error & { statusCode?: number }).statusCode = 401;
    next(err);
    return;
  }

  try {
    const [user] = await db
      .select({
        subscriptionPlan: users.subscriptionPlan,
        subscriptionStatus: users.subscriptionStatus,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      const err = new Error('Usuario no encontrado');
      (err as Error & { statusCode?: number }).statusCode = 404;
      next(err);
      return;
    }

    const hasAccess =
      user.subscriptionPlan === 'gold' && user.subscriptionStatus === 'active';

    if (!hasAccess) {
      logger.info(
        {
          userId,
          plan: user.subscriptionPlan,
          status: user.subscriptionStatus,
        },
        'Chatbot access denied: not on gold plan'
      );
      const err = new Error(
        'Esta función está disponible exclusivamente para usuarios del plan Gold. Por favor, actualiza tu suscripción para acceder al asistente de IA y WhatsApp Bot.'
      );
      (err as Error & { statusCode?: number }).statusCode = 403;
      next(err);
      return;
    }

    next();
  } catch (err) {
    logger.error({ userId, err }, 'Error checking enterprise plan access');
    next(err);
  }
};
