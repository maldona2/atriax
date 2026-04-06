import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { debtDashboardService } from '../services/debtDashboardService.js';
import { db, appointments, paymentRecords } from '../db/client.js';

const createPaymentPlanSchema = z.object({
  patientId: z.string().uuid(),
  totalAmountCents: z.number().int().positive(),
  installmentAmountCents: z.number().int().positive(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  startDate: z.string().datetime({ offset: true }),
});

const updatePaymentPlanSchema = z.object({
  installmentAmountCents: z.number().int().positive().optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  nextPaymentDate: z.string().datetime({ offset: true }).nullable().optional(),
});

const recordPaymentSchema = z.object({
  paymentDate: z.string().datetime({ offset: true }),
  paymentStatus: z.enum(['on_time', 'late']),
});

const updateAppointmentPaymentSchema = z.object({
  amountCents: z.number().int().nonnegative(),
  paymentDate: z.string().datetime({ offset: true }),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'insurance', 'other']),
  paymentStatus: z.enum(['unpaid', 'paid', 'partial', 'refunded']),
});

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

const dateRangeSchema = z.object({
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
});

const paymentHistoryQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  paymentStatus: z.enum(['paid', 'unpaid', 'partially_paid']).optional(),
  minAmount: z.coerce.number().int().min(0).optional(),
  maxAmount: z.coerce.number().int().min(0).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const planStatusSchema = z.object({
  status: z.enum(['active', 'completed', 'delinquent', 'cancelled']).optional(),
});

// GET /api/debt-dashboard/statistics
router.get(
  '/statistics',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const parsed = dateRangeSchema.safeParse(req.query);
      if (!parsed.success) {
        const err = new Error('Invalid query parameters');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const { startDate, endDate } = parsed.data;
      const statistics = await debtDashboardService.calculateStatistics(
        tenantId,
        startDate,
        endDate
      );
      res.json(statistics);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/debt-dashboard/aging-report
router.get(
  '/aging-report',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const report = await debtDashboardService.generateAgingReport(tenantId);
      res.json(report);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/debt-dashboard/payment-plans
router.get(
  '/payment-plans',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const parsed = planStatusSchema.safeParse(req.query);
      if (!parsed.success) {
        const err = new Error('Invalid query parameters');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const plans = await debtDashboardService.getPaymentPlans(
        tenantId,
        parsed.data.status
      );
      res.json({ plans });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/debt-dashboard/payment-history
router.get(
  '/payment-history',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const parsed = paymentHistoryQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        const err = new Error('Invalid query parameters');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const { minAmount, maxAmount, page, pageSize, ...rest } = parsed.data;
      const result = await debtDashboardService.getPaymentHistory(tenantId, {
        ...rest,
        minAmountCents: minAmount,
        maxAmountCents: maxAmount,
        page,
        pageSize,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/debt-dashboard/payment-methods
router.get(
  '/payment-methods',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const methods =
        await debtDashboardService.getPaymentMethodAnalytics(tenantId);
      res.json({ methods });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/debt-dashboard/patient-appointments?patientId=<uuid>
const patientAppointmentsSchema = z.object({
  patientId: z.string().uuid(),
});

router.get(
  '/patient-appointments',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const parsed = patientAppointmentsSchema.safeParse(req.query);
      if (!parsed.success) {
        const err = new Error('patientId is required and must be a valid UUID');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const { patientId } = parsed.data;
      const rows = await db
        .select({
          id: appointments.id,
          scheduledAt: appointments.scheduledAt,
          status: appointments.status,
          paymentStatus: appointments.paymentStatus,
          totalAmountCents: appointments.totalAmountCents,
          notes: appointments.notes,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            eq(appointments.patientId, patientId)
          )
        )
        .orderBy(desc(appointments.scheduledAt));
      res.json({ appointments: rows });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/debt-dashboard/payment-plans
router.post(
  '/payment-plans',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const parsed = createPaymentPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid request body');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const plan = await debtDashboardService.createPaymentPlan(
        tenantId,
        parsed.data
      );
      res.status(201).json(plan);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/debt-dashboard/payment-plans/:id
router.patch(
  '/payment-plans/:id',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;
      const parsed = updatePaymentPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid request body');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const plan = await debtDashboardService.updatePaymentPlan(
        tenantId,
        id,
        parsed.data
      );
      res.json(plan);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/debt-dashboard/payment-plans/:id
router.delete(
  '/payment-plans/:id',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;
      await debtDashboardService.cancelPaymentPlan(tenantId, id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/debt-dashboard/payment-plans/:id/payments
router.post(
  '/payment-plans/:id/payments',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;
      const parsed = recordPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid request body');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const plan = await debtDashboardService.recordPayment(
        tenantId,
        id,
        parsed.data
      );
      res.json(plan);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/debt-dashboard/payment-plans/:id/mark-delinquent
router.post(
  '/payment-plans/:id/mark-delinquent',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;
      const plan = await debtDashboardService.markPlanDelinquent(tenantId, id);
      res.json(plan);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/debt-dashboard/payment-plans/:id/reactivate
router.post(
  '/payment-plans/:id/reactivate',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;
      const plan = await debtDashboardService.reactivatePlan(tenantId, id);
      res.json(plan);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/debt-dashboard/appointments/:appointmentId/payment
router.patch(
  '/appointments/:appointmentId/payment',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const { appointmentId } = req.params;
      const parsed = updateAppointmentPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid request body');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const { amountCents, paymentDate, paymentMethod, paymentStatus } =
        parsed.data;

      const [appointment] = await db
        .select({ id: appointments.id, patientId: appointments.patientId })
        .from(appointments)
        .where(
          and(
            eq(appointments.id, appointmentId),
            eq(appointments.tenantId, tenantId)
          )
        );

      if (!appointment) {
        const err = new Error('Turno no encontrado');
        (err as Error & { statusCode?: number }).statusCode = 404;
        return next(err);
      }

      const [updated] = await db.transaction(async (tx) => {
        await tx.insert(paymentRecords).values({
          tenantId,
          patientId: appointment.patientId,
          appointmentId,
          amountCents,
          paymentMethod,
          paymentDate: new Date(paymentDate),
        });

        return tx
          .update(appointments)
          .set({
            paymentStatus,
            totalAmountCents: amountCents,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(appointments.id, appointmentId),
              eq(appointments.tenantId, tenantId)
            )
          )
          .returning({
            id: appointments.id,
            scheduledAt: appointments.scheduledAt,
            status: appointments.status,
            paymentStatus: appointments.paymentStatus,
            totalAmountCents: appointments.totalAmountCents,
            notes: appointments.notes,
          });
      });

      res.json({ appointment: updated });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
