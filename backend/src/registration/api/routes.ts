import { Router } from 'express';
import { z } from 'zod';
import { ValidationService } from '../services/ValidationService';
import { EmailVerificationService } from '../services/EmailVerificationService';
import { RegistrationService } from '../services/RegistrationService';

const router = Router();

const registrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  acceptedTerms: z.boolean(),
  acceptedPrivacy: z.boolean(),
});

const resendSchema = z.object({
  email: z.string().email(),
});

const validator = new ValidationService();
const emailService = new EmailVerificationService();
const registration = new RegistrationService(validator, emailService);

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registrationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos de registro inválidos',
        errors: parsed.error.errors.map((e) => e.message),
      });
    }

    const result = await registration.registerUser(parsed.data);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/verify/:token', async (req, res, next) => {
  try {
    const token = req.params.token;
    const result = await registration.verifyEmail(token);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/resend', async (req, res, next) => {
  try {
    const parsed = resendSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email',
      });
    }

    const result = await registration.resendVerification(parsed.data.email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

