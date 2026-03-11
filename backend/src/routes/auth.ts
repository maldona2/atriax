import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const educationItemSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  year: z.number().int(),
});

const workingHoursSchema = z.object({
  start: z.string(),
  end: z.string(),
  days: z.array(z.string()),
});

const updateProfileSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  specialty: z.string().nullable().optional(),
  licenseNumber: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  education: z.array(educationItemSchema).nullable().optional(),
  workingHours: workingHoursSchema.nullable().optional(),
  appointmentDuration: z.number().int().min(5).max(120).nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error('Invalid email or password');
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }

      const { email, password } = parsed.data;
      const result = await authService.login(email, password);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(new Error('Unauthorized'));
      const user = await authService.me(req.user.id);
      res.json(user);
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(new Error('Unauthorized'));
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error(
          parsed.error.errors[0]?.message ?? 'Invalid request'
        );
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      const user = await authService.updateProfile(req.user.id, parsed.data);
      res.json(user);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/me/password',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(new Error('Unauthorized'));
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        const err = new Error(
          parsed.error.errors[0]?.message ?? 'Invalid request'
        );
        (err as Error & { statusCode?: number }).statusCode = 400;
        return next(err);
      }
      await authService.changePassword(
        req.user.id,
        parsed.data.currentPassword,
        parsed.data.newPassword
      );
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
);

export default router;
