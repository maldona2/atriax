import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as tenantService from '../services/tenantService.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
const adminOnly = [authenticate, requireRole('super_admin')];

const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
});

router.get(
  '/tenants',
  adminOnly,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tenants = await tenantService.listTenants();
      res.json(tenants);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/tenants',
  adminOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createTenantSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error(
          parsed.error.errors.map((e) => e.message).join(', ')
        );
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }

      const tenant = await tenantService.createTenant(parsed.data);
      res.status(201).json(tenant);
    } catch (e) {
      next(e);
    }
  }
);

router.put(
  '/tenants/:id',
  adminOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateTenantSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid payload');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }

      const tenant = await tenantService.updateTenant(
        req.params.id,
        parsed.data
      );
      if (!tenant) {
        const err = new Error('Tenant not found');
        (err as Error & { statusCode?: number }).statusCode = 404;
        return next(err);
      }
      res.json(tenant);
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  '/tenants/:id',
  adminOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ok = await tenantService.deactivateTenant(req.params.id);
      if (!ok) {
        const err = new Error('Tenant not found');
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
