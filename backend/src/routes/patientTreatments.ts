import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as patientTreatmentService from '../services/patientTreatmentService.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
const professionalOnly = [authenticate, requireRole('professional')];

const createPatientTreatmentSchema = z.object({
  patient_id: z.string().uuid(),
  treatment_id: z.string().uuid(),
  current_session: z.number().int().min(1).optional(),
});

const updatePatientTreatmentSchema = z.object({
  current_session: z.number().int().min(1).optional(),
  last_appointment_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

const completeSessionSchema = z.object({
  appointment_id: z.string().uuid().optional().nullable(),
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
  '/patient/:patientId',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const list = await patientTreatmentService.listByPatient(
        tenantId,
        req.params.patientId
      );
      res.json(list);
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/patient/:patientId/active',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const list = await patientTreatmentService.listActiveByPatient(
        tenantId,
        req.params.patientId
      );
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
      const parsed = createPatientTreatmentSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid data');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const tenantId = getTenantId(req);
      const patientTreatment = await patientTreatmentService.create(
        tenantId,
        parsed.data
      );
      res.status(201).json(patientTreatment);
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
      const parsed = updatePatientTreatmentSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid data');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const tenantId = getTenantId(req);
      const patientTreatment = await patientTreatmentService.updateProgress(
        tenantId,
        req.params.id,
        parsed.data
      );
      if (!patientTreatment) {
        const err = new Error('Patient treatment not found');
        (err as Error & { statusCode?: number }).statusCode = 404;
        return next(err);
      }
      res.json(patientTreatment);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/:id/complete-session',
  professionalOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = completeSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid data');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const tenantId = getTenantId(req);
      const patientTreatment = await patientTreatmentService.completeSession(
        tenantId,
        req.params.id,
        parsed.data.appointment_id ?? null
      );
      if (!patientTreatment) {
        const err = new Error('Patient treatment not found');
        (err as Error & { statusCode?: number }).statusCode = 404;
        return next(err);
      }
      res.json(patientTreatment);
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
      const removed = await patientTreatmentService.remove(
        tenantId,
        req.params.id
      );
      if (!removed) {
        const err = new Error('Patient treatment not found');
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
