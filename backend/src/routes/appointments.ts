import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as appointmentService from '../services/appointmentService.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { LimitEnforcementService } from '../registration/services/LimitEnforcementService.js';

const router = Router();
const professionalOnly = [authenticate, requireRole('professional')];
const limitEnforcer = new LimitEnforcementService();

const statusEnum = z.enum(['pending', 'confirmed', 'completed', 'cancelled']);
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

router.get(
  '/',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId || !(await limitEnforcer.canAccessCalendar(userId))) {
        const err = new Error(
          'Tu plan actual no incluye acceso al calendario. Actualiza tu suscripción para usar esta funcionalidad.'
        );
        (err as Error & { statusCode?: number }).statusCode = 403;
        return next(err);
      }
      const tenantId = getTenantId(req);
      const { date, status, patientId } = req.query;

      const filters = {
        date: typeof date === 'string' ? date : undefined,
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
      if (!userId || !(await limitEnforcer.canAccessCalendar(userId))) {
        const err = new Error(
          'Tu plan actual no incluye acceso al calendario. Actualiza tu suscripción para crear turnos.'
        );
        (err as Error & { statusCode?: number }).statusCode = 403;
        return next(err);
      }
      const tenantId = getTenantId(req);
      const appt = await appointmentService.create(tenantId, parsed.data);
      res.status(201).json(appt);
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
