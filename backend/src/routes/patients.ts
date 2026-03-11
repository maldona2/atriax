import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as patientService from '../services/patientService.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
const professionalOnly = [authenticate, requireRole('professional')];

const createPatientSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  date_of_birth: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
});

const updatePatientSchema = createPatientSchema.partial();

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
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const patients = await patientService.list(tenantId, q);
      res.json(patients);
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
      const parsed = createPatientSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid patient data');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }

      const data = {
        ...parsed.data,
        email: parsed.data.email || null,
        date_of_birth: parsed.data.date_of_birth || null,
      };
      const tenantId = getTenantId(req);
      const patient = await patientService.create(tenantId, data);
      res.status(201).json(patient);
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
      const result = await patientService.getById(tenantId, req.params.id);
      if (!result) {
        const err = new Error('Patient not found');
        (err as Error & { statusCode?: number }).statusCode = 404;
        return next(err);
      }
      res.json(result);
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
      const parsed = updatePatientSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid patient data');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }

      const data = {
        ...parsed.data,
        email: parsed.data.email === '' ? null : parsed.data.email,
        date_of_birth:
          parsed.data.date_of_birth === '' ? null : parsed.data.date_of_birth,
      };
      const tenantId = getTenantId(req);
      const patient = await patientService.update(
        tenantId,
        req.params.id,
        data
      );
      if (!patient) {
        const err = new Error('Patient not found');
        (err as Error & { statusCode?: number }).statusCode = 404;
        return next(err);
      }
      res.json(patient);
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
      const ok = await patientService.remove(tenantId, req.params.id);
      if (!ok) {
        const err = new Error('Patient not found');
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
