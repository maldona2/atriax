import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as sessionService from '../services/sessionService.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
const professionalOnly = [authenticate, requireRole('professional')];

const createSessionSchema = z.object({
  appointment_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  procedures_performed: z.string().min(1),
  recommendations: z.string().optional().nullable(),
  next_visit_notes: z.string().optional().nullable(),
});

const updateSessionSchema = createSessionSchema
  .omit({ appointment_id: true, patient_id: true })
  .partial()
  .extend({
    procedures_performed: z.string().min(1).optional(),
  });

function getTenantId(req: Request): string {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    const err = new Error('Forbidden');
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }
  return tenantId;
}

router.post(
  '/',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid session data');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const tenantId = getTenantId(req);
      const session = await sessionService.create(tenantId, parsed.data);
      res.status(201).json(session);
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/:id',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const session = await sessionService.getById(tenantId, req.params.id);
      if (!session) {
        const err = new Error('Session not found');
        (err as Error & { statusCode?: number }).statusCode = 404;
        return next(err);
      }
      res.json(session);
    } catch (e) {
      next(e);
    }
  }
);

router.put(
  '/:id',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid session data');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const tenantId = getTenantId(req);
      const session = await sessionService.update(
        tenantId,
        req.params.id,
        parsed.data
      );
      if (!session) {
        const err = new Error('Session not found');
        (err as Error & { statusCode?: number }).statusCode = 404;
        return next(err);
      }
      res.json(session);
    } catch (e) {
      next(e);
    }
  }
);

export default router;
