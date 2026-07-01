import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as tenantService from '../services/tenantService.js';
import * as infraPaymentService from '../services/infraPaymentService.js';
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

const updateSubscriptionSchema = z.object({
  plan: z.enum(['free', 'pro', 'gold']),
  status: z.enum(['active', 'paused', 'cancelled']),
});

const markPaidSchema = z.object({
  billingMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Invalid billing month, expected YYYY-MM')
    .optional(),
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

router.put(
  '/tenants/:id/subscription',
  adminOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateSubscriptionSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid payload');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }

      const result = await tenantService.updateTenantSubscription(
        req.params.id,
        parsed.data.plan,
        parsed.data.status
      );
      if (!result) {
        const err = new Error('Tenant not found');
        (err as Error & { statusCode?: number }).statusCode = 404;
        return next(err);
      }
      res.json(result);
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

// ─── infra payments ───────────────────────────────────────────────────────────

router.get(
  '/infra-payments',
  adminOnly,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const overview = await infraPaymentService.listPaymentsOverview();
      res.json(overview);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/tenants/:id/infra-payments',
  adminOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = markPaidSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        const err = new Error(
          parsed.error.errors.map((e) => e.message).join(', ')
        );
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }

      const month =
        parsed.data.billingMonth ?? infraPaymentService.currentBillingMonth();
      const record = await infraPaymentService.markPaid(
        req.params.id,
        month,
        req.user?.id ?? null
      );
      res.status(201).json(record);
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  '/tenants/:id/infra-payments/:month',
  adminOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ok = await infraPaymentService.unmarkPaid(
        req.params.id,
        req.params.month
      );
      if (!ok) {
        const err = new Error('Payment record not found');
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
