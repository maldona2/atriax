import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as treatmentService from '../services/treatmentService.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
const professionalOnly = [authenticate, requireRole('professional')];

const createTreatmentSchema = z.object({
  name: z.string().min(1),
  price_cents: z.number().int().min(0),
  cost_cents: z.number().int().min(0).optional().nullable(),
  initial_frequency_weeks: z.number().int().min(1).optional().nullable(),
  initial_sessions_count: z.number().int().min(1).optional().nullable(),
  maintenance_frequency_weeks: z.number().int().min(1).optional().nullable(),
  protocol_notes: z.string().optional().nullable(),
});

const updateTreatmentSchema = createTreatmentSchema.partial();

function getTenantId(req: Request): string {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    const err = new Error('Forbidden');
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }
  return tenantId;
}

router.get(
  '/',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const list = await treatmentService.list(tenantId);
      res.json(list);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createTreatmentSchema.safeParse(req.body);
      if (!parsed.success) {
        // Check for cost validation errors
        const costError = parsed.error.issues.find(
          (issue) => issue.path[0] === 'cost_cents'
        );
        if (costError) {
          const err = new Error('El costo debe ser un número no negativo');
          (err as Error & { statusCode?: number }).statusCode = 400;
          return next(err);
        }
        const err = new Error('Invalid treatment data');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const tenantId = getTenantId(req);
      const treatment = await treatmentService.create(tenantId, parsed.data);
      res.status(201).json(treatment);
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
      const parsed = updateTreatmentSchema.safeParse(req.body);
      if (!parsed.success) {
        // Check for cost validation errors
        const costError = parsed.error.issues.find(
          (issue) => issue.path[0] === 'cost_cents'
        );
        if (costError) {
          const err = new Error('El costo debe ser un número no negativo');
          (err as Error & { statusCode?: number }).statusCode = 400;
          return next(err);
        }
        const err = new Error('Invalid treatment data');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const tenantId = getTenantId(req);
      const treatment = await treatmentService.update(
        tenantId,
        req.params.id,
        parsed.data
      );
      if (!treatment) {
        const err = new Error('Treatment not found');
        (err as Error & { statusCode?: number }).statusCode = 404;
        return next(err);
      }
      res.json(treatment);
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  '/:id',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const removed = await treatmentService.remove(tenantId, req.params.id);
      if (!removed) {
        const err = new Error('Treatment not found');
        (err as Error & { statusCode?: number }).statusCode = 404;
        return next(err);
      }
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
);

export default router;
