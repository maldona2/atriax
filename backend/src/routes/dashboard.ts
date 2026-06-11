import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import * as dashboardService from '../services/dashboardService.js';

const router = Router();
const professionalOnly = [authenticate, requireRole('professional')];

function getTenantId(req: Request): string {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    const err = new Error('Forbidden');
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }
  return tenantId;
}

const patientTreatmentIdSchema = z.string().uuid();

// GET /api/dashboard
router.get(
  '/',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const data = await dashboardService.getDashboard(tenantId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/dashboard/cycle-reminder/:patientTreatmentId
router.post(
  '/cycle-reminder/:patientTreatmentId',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const parsed = patientTreatmentIdSchema.safeParse(
        req.params.patientTreatmentId
      );
      if (!parsed.success) {
        const err = new Error('patientTreatmentId must be a valid UUID');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const result = await dashboardService.sendCycleReminder(
        tenantId,
        parsed.data
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/dashboard/cycle-reminder/:patientTreatmentId/dismiss
router.post(
  '/cycle-reminder/:patientTreatmentId/dismiss',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const parsed = patientTreatmentIdSchema.safeParse(
        req.params.patientTreatmentId
      );
      if (!parsed.success) {
        const err = new Error('patientTreatmentId must be a valid UUID');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const result = await dashboardService.dismissCycleAlert(
        tenantId,
        parsed.data
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
