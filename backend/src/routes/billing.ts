import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import * as infraPaymentService from '../services/infraPaymentService.js';

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

// GET /api/billing/status — current-month infra payment status for this tenant
router.get(
  '/status',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const status = await infraPaymentService.getTenantStatus(tenantId);
      res.json(status);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
