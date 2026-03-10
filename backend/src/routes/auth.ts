import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
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
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new Error('Unauthorized'));
    const user = await authService.me(req.user.id);
    res.json(user);
  } catch (e) {
    next(e);
  }
});

export default router;
