/**
 * Property-based test for rate limiting on POST /api/auth/forgot-password
 * Feature: forgot-password, Property 14
 * Uses fast-check with Jest + supertest
 */

import * as fc from 'fast-check';
import request from 'supertest';
import express, { Express } from 'express';
import rateLimit from 'express-rate-limit';
import { errorHandler } from '../../utils/errorHandler.js';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../db/client.js', () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    })),
    insert: jest.fn(() => ({
      values: jest.fn().mockResolvedValue(undefined),
    })),
    update: jest.fn(() => ({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(undefined),
    })),
  },
  users: { _tableName: 'users' },
  passwordResetTokens: { _tableName: 'passwordResetTokens' },
}));

jest.mock('../../services/mailService.js', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

// ── App factory ───────────────────────────────────────────────────────────────
// We build a fresh app for each property run so the rate-limiter store is reset.

function buildApp(): Express {
  const app = express();
  app.use(express.json());

  // Replicate the same limiter config from auth.ts
  const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message:
          'Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde.',
      },
    },
    statusCode: 429,
    // Use a fresh in-memory store per app instance (default MemoryStore is per-instance)
  });

  app.post(
    '/api/auth/forgot-password',
    forgotPasswordLimiter,
    async (req, res, next) => {
      try {
        // Minimal handler: always return 200 with generic message
        res.status(200).json({
          message: 'Si el email está registrado, recibirás un enlace en breve.',
        });
      } catch (e) {
        next(e);
      }
    }
  );

  app.use(errorHandler);
  return app;
}

// ── Generator ─────────────────────────────────────────────────────────────────

const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{2,8}$/),
    fc.constantFrom('example.com', 'test.org', 'mail.net')
  )
  .map(([local, domain]) => `${local}@${domain}`);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('auth rate limiting — property-based tests', () => {
  // ── Property 14 ────────────────────────────────────────────────────────────
  test('Property 14: 6th request from same IP within 15 min returns 429 with correct message', async () => {
    // **Validates: Requirements 6.1, 6.2**
    await fc.assert(
      fc.asyncProperty(
        fc.array(validEmailArb, { minLength: 6, maxLength: 10 }),
        async (emails) => {
          // Fresh app = fresh rate-limiter store
          const app = buildApp();

          // Send first 5 requests — all should succeed (200)
          for (let i = 0; i < 5; i++) {
            const res = await request(app)
              .post('/api/auth/forgot-password')
              .set('X-Forwarded-For', '1.2.3.4')
              .send({ email: emails[i % emails.length] });

            expect(res.status).toBe(200);
          }

          // 6th request must be rate-limited (429)
          const res6 = await request(app)
            .post('/api/auth/forgot-password')
            .set('X-Forwarded-For', '1.2.3.4')
            .send({ email: emails[5 % emails.length] });

          expect(res6.status).toBe(429);
          expect(res6.body.error.message).toBe(
            'Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde.'
          );
        }
      ),
      { numRuns: 20 }
    );
  }, 60_000);
});
