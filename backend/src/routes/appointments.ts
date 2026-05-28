import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as appointmentService from '../services/appointmentService.js';
import { validateAndConsumeCancellationToken } from '../services/cancellationTokenService.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { LimitEnforcer } from '../subscriptions/services/LimitEnforcer.js';
import { PlanManager } from '../subscriptions/services/PlanManager.js';
import { UsageTracker } from '../subscriptions/services/UsageTracker.js';
import { AppointmentLimitExceededError } from '../subscriptions/models/errors.js';
import logger from '../utils/logger.js';

const router = Router();
const professionalOnly = [authenticate, requireRole('professional')];
const appointmentLimitEnforcer = new LimitEnforcer(
  new PlanManager(),
  new UsageTracker()
);

const statusEnum = z.enum([
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no-show',
]);
const paymentStatusEnum = z.enum(['unpaid', 'paid', 'partial', 'refunded']);

const treatmentLineItemSchema = z.object({
  treatment_id: z.string().uuid(),
  quantity: z.number().int().min(1),
  unit_price_cents: z.number().int().min(0),
});

const createAppointmentSchema = z.object({
  patient_id: z.string().uuid(),
  scheduled_at: z.string().datetime({ offset: true }),
  duration_minutes: z.number().int().positive().optional(),
  notes: z.string().optional().nullable(),
  payment_status: paymentStatusEnum.optional(),
  treatments: z.array(treatmentLineItemSchema).optional(),
});

const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  status: statusEnum.optional(),
  payment_status: paymentStatusEnum.optional(),
  treatments: z.array(treatmentLineItemSchema).optional(),
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

// ─── Public: cancel appointment via one-time token (from WA link) ────────────

router.post(
  '/cancel-by-token',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body as { token?: string };
      if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'Token requerido' });
        return;
      }

      const payload = await validateAndConsumeCancellationToken(token);
      if (!payload) {
        res.status(410).json({
          error: 'El link de cancelación no es válido o ya fue utilizado.',
        });
        return;
      }

      const appt = await appointmentService.cancel(
        payload.tenantId,
        payload.appointmentId
      );
      if (!appt) {
        res.status(404).json({ error: 'Turno no encontrado' });
        return;
      }

      logger.info(
        { appointmentId: payload.appointmentId },
        'Appointment cancelled via WA cancel link'
      );
      res.json({ message: 'Turno cancelado exitosamente' });
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const { date, date_from, date_to, status, patientId } = req.query;

      const filters = {
        date: typeof date === 'string' ? date : undefined,
        dateFrom: typeof date_from === 'string' ? date_from : undefined,
        dateTo: typeof date_to === 'string' ? date_to : undefined,
        status:
          typeof status === 'string' && statusEnum.safeParse(status).success
            ? (status as any)
            : undefined,
        patientId: typeof patientId === 'string' ? patientId : undefined,
      };

      const appts = await appointmentService.list(tenantId, filters);
      res.json(appts);
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
      const parsed = createAppointmentSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid appointment data');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const userId = req.user?.id;
      if (!userId) {
        const err = new Error('Forbidden');
        (err as Error & { statusCode?: number }).statusCode = 403;
        return next(err);
      }

      const tenantId = getTenantId(req);

      // Atomically reserve a daily slot before creating the appointment so
      // concurrent requests cannot exceed the limit (check-then-increment race).
      const reservation =
        await appointmentLimitEnforcer.reserveDailyAppointment(userId);
      if (!reservation.allowed) {
        const isUnavailable = reservation.reason === 'service_unavailable';
        res.status(isUnavailable ? 503 : 429).json({
          error: isUnavailable
            ? 'Service temporarily unavailable'
            : 'Daily appointment limit exceeded',
          limit: reservation.limit,
          used: reservation.currentUsage,
          remaining: reservation.remaining,
          resetTime: reservation.resetTime.toISOString(),
        });
        return;
      }

      let appt;
      try {
        appt = await appointmentService.create(tenantId, {
          ...parsed.data,
          userRole: req.user?.role,
        });
      } catch (createErr) {
        // The appointment was not persisted — release the reserved slot.
        await appointmentLimitEnforcer
          .releaseDailyAppointment(userId)
          .catch((err) => {
            logger.error(
              { userId, error: err },
              'Failed to release reserved appointment slot'
            );
          });
        throw createErr;
      }

      res.status(201).json(appt);
    } catch (e) {
      if (e instanceof AppointmentLimitExceededError) {
        res.status(429).json({
          error: 'Daily appointment limit exceeded',
          limit: e.limit,
          used: e.currentUsage,
          remaining: Math.max(0, e.limit - e.currentUsage),
          resetTime: e.resetTime.toISOString(),
        });
        return;
      }
      next(e);
    }
  }
);

router.get(
  '/:id/detail',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const appt = await appointmentService.getDetailById(
        tenantId,
        req.params.id
      );
      if (!appt) {
        const err = new Error('Appointment not found');
        (err as Error & { statusCode?: number }).statusCode = 404;
        return next(err);
      }
      res.json(appt);
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
      const appt = await appointmentService.getById(tenantId, req.params.id);
      if (!appt) {
        const err = new Error('Appointment not found');
        (err as Error & { statusCode?: number }).statusCode = 404;
        return next(err);
      }
      res.json(appt);
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
      const parsed = updateAppointmentSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid appointment data');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const tenantId = getTenantId(req);
      const appt = await appointmentService.update(
        tenantId,
        req.params.id,
        parsed.data
      );
      if (!appt) {
        const err = new Error('Appointment not found');
        (err as Error & { statusCode?: number }).statusCode = 404;
        return next(err);
      }
      res.json(appt);
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
      const appt = await appointmentService.cancel(tenantId, req.params.id);
      if (!appt) {
        const err = new Error('Appointment not found');
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
