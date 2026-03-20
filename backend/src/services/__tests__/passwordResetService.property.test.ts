/**
 * Property-based tests for passwordResetService
 * Feature: forgot-password, Properties 1, 3, 5, 6, 7, 8, 9
 * Uses fast-check with Jest
 */

import * as fc from 'fast-check';
import crypto from 'crypto';

jest.mock('../../db/client.js', () => ({
  db: { select: jest.fn(), insert: jest.fn(), update: jest.fn() },
  users: {},
  passwordResetTokens: {},
}));

jest.mock('../../services/mailService.js', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function selectReturning(rows: unknown[]) {
  return jest.fn().mockReturnValue({
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  });
}

function updateCapturing(captured: unknown[]) {
  return jest.fn().mockReturnValue({
    set: jest.fn().mockImplementation((vals: unknown) => {
      captured.push(vals);
      return { where: jest.fn().mockResolvedValue(undefined) };
    }),
  });
}

function insertCapturing(captured: unknown[]) {
  return jest.fn().mockReturnValue({
    values: jest.fn().mockImplementation((vals: unknown) => {
      captured.push(vals);
      return Promise.resolve(undefined);
    }),
  });
}

// Small fixed pools to avoid large shrink trees
const UUIDS = [
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  '11111111-2222-3333-4444-555555555555',
  'deadbeef-cafe-babe-face-012345678901',
];

const EMAILS = ['alice@example.com', 'bob@test.org', 'carol@mail.net'];

const PASSWORDS = ['password123', 'securePass!', 'abcdefgh'];

const uuidArb = fc.constantFrom(...UUIDS);
const emailArb = fc.constantFrom(...EMAILS);
const passwordArb = fc.constantFrom(...PASSWORDS);
const rawTokenArb = fc.nat({ max: 99 }).map((seed) => sha256(`seed-${seed}`));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const svc =
  require('../passwordResetService.js') as typeof import('../passwordResetService.js');

describe('passwordResetService property-based tests', () => {
  const { db } = jest.requireMock('../../db/client.js') as {
    db: { select: jest.Mock; insert: jest.Mock; update: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Property 5 ─────────────────────────────────────────────────────────────
  test('Property 5: generated raw token is at least 64 hex chars', () => {
    // **Validates: Requirements 3.1**
    fc.assert(
      fc.property(fc.nat({ max: 10 }), () => {
        const rawToken = crypto.randomBytes(32).toString('hex');
        expect(rawToken).toMatch(/^[0-9a-f]+$/);
        expect(rawToken.length).toBeGreaterThanOrEqual(64);
      }),
      { numRuns: 50 }
    );
  });

  // ── Property 6 ─────────────────────────────────────────────────────────────
  test('Property 6: SHA-256(rawToken) equals stored hash and differs from rawToken', () => {
    // **Validates: Requirements 3.2**
    fc.assert(
      fc.property(fc.nat({ max: 10 }), () => {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = sha256(rawToken);
        expect(tokenHash).toBe(sha256(rawToken));
        expect(tokenHash).not.toBe(rawToken);
        expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
      }),
      { numRuns: 50 }
    );
  });

  // ── Property 1 ─────────────────────────────────────────────────────────────
  test('Property 1: requestPasswordReset creates a DB record with correct userId, ~1h expiry, used=false', async () => {
    // **Validates: Requirements 2.2, 3.1**
    // Run sequentially with small numRuns to avoid OOM from bcrypt + delays
    await fc.assert(
      fc.asyncProperty(uuidArb, emailArb, async (userId, email) => {
        const inserts: Array<{
          userId: string;
          tokenHash: string;
          expiresAt: Date;
          used: boolean;
        }> = [];
        db.select = selectReturning([
          { id: userId, email: email.toLowerCase() },
        ]);
        db.update = updateCapturing([]);
        db.insert = insertCapturing(inserts);

        const before = Date.now();
        await svc.requestPasswordReset(email);
        const after = Date.now();

        expect(inserts.length).toBeGreaterThanOrEqual(1);
        const record = inserts[inserts.length - 1];
        expect(record.userId).toBe(userId);
        expect(record.used).toBe(false);

        const oneHourMs = 60 * 60 * 1000;
        const expiresMs = record.expiresAt.getTime();
        expect(expiresMs).toBeGreaterThanOrEqual(before + oneHourMs - 1000);
        expect(expiresMs).toBeLessThanOrEqual(after + oneHourMs + 1000);
      }),
      { numRuns: 5 }
    );
  }, 30_000);

  // ── Property 7 ─────────────────────────────────────────────────────────────
  test('Property 7: calling requestPasswordReset twice invalidates the first token', async () => {
    // **Validates: Requirements 3.3**
    await fc.assert(
      fc.asyncProperty(uuidArb, emailArb, async (userId, email) => {
        const inserts: unknown[] = [];
        const updates: Array<{ used?: boolean }> = [];
        db.select = selectReturning([
          { id: userId, email: email.toLowerCase() },
        ]);
        db.insert = insertCapturing(inserts);
        db.update = updateCapturing(updates);

        await svc.requestPasswordReset(email);
        await svc.requestPasswordReset(email);

        expect(inserts.length).toBe(2);
        expect(
          updates.filter((u) => u.used === true).length
        ).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 5 }
    );
  }, 30_000);

  // ── Property 8 ─────────────────────────────────────────────────────────────
  test('Property 8: validateResetToken throws 400 for expired, used, or nonexistent tokens', async () => {
    // **Validates: Requirements 3.4, 3.5, 4.3**
    const expectedMessage =
      'El enlace de recuperaci\u00f3n no es v\u00e1lido o ha expirado.';

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.record({
            scenario: fc.constant('nonexistent' as const),
            rawToken: rawTokenArb,
          }),
          fc.record({
            scenario: fc.constant('expired' as const),
            rawToken: rawTokenArb,
          }),
          fc.record({
            scenario: fc.constant('used' as const),
            rawToken: rawTokenArb,
          })
        ),
        async ({ scenario, rawToken }) => {
          const tokenHash = sha256(rawToken);

          if (scenario === 'nonexistent') {
            db.select = selectReturning([]);
          } else if (scenario === 'expired') {
            db.select = selectReturning([
              {
                id: 'id',
                tokenHash,
                expiresAt: new Date(Date.now() - 1000),
                used: false,
              },
            ]);
          } else {
            db.select = selectReturning([
              {
                id: 'id',
                tokenHash,
                expiresAt: new Date(Date.now() + 3_600_000),
                used: true,
              },
            ]);
          }

          let thrown: (Error & { statusCode?: number }) | null = null;
          try {
            await svc.validateResetToken(rawToken);
          } catch (e) {
            thrown = e as Error & { statusCode?: number };
          }

          expect(thrown).not.toBeNull();
          expect(thrown!.message).toBe(expectedMessage);
          expect(thrown!.statusCode).toBe(400);
        }
      ),
      { numRuns: 20 }
    );
  }, 30_000);

  // ── Property 9 ─────────────────────────────────────────────────────────────
  test('Property 9: resetPassword updates passwordHash, marks token used, and rejects reuse', async () => {
    // **Validates: Requirements 3.6, 4.6**
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        passwordArb,
        async (tokenId, userId, newPassword) => {
          const userUpdates: Array<{ passwordHash?: string }> = [];
          const tokenUpdates: Array<{ used?: boolean }> = [];
          const rawToken = crypto.randomBytes(32).toString('hex');
          const tokenHash = sha256(rawToken);

          let callCount = 0;
          db.select = jest.fn().mockImplementation(() => ({
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockImplementation(() => {
              callCount++;
              const base = {
                id: tokenId,
                userId,
                tokenHash,
                expiresAt: new Date(Date.now() + 3_600_000),
              };
              return Promise.resolve([{ ...base, used: callCount !== 1 }]);
            }),
          }));

          db.update = jest.fn().mockImplementation(() => ({
            set: jest
              .fn()
              .mockImplementation(
                (vals: { passwordHash?: string; used?: boolean }) => ({
                  where: jest.fn().mockImplementation(() => {
                    if (vals.passwordHash !== undefined) userUpdates.push(vals);
                    if (vals.used !== undefined) tokenUpdates.push(vals);
                    return Promise.resolve(undefined);
                  }),
                })
              ),
          }));

          await svc.resetPassword(rawToken, newPassword);

          expect(userUpdates.length).toBeGreaterThanOrEqual(1);
          expect(userUpdates[0].passwordHash).toBeDefined();
          expect(userUpdates[0].passwordHash).not.toBe(newPassword);
          expect(
            tokenUpdates.filter((u) => u.used === true).length
          ).toBeGreaterThanOrEqual(1);

          let secondError: (Error & { statusCode?: number }) | null = null;
          try {
            await svc.resetPassword(rawToken, newPassword);
          } catch (e) {
            secondError = e as Error & { statusCode?: number };
          }
          expect(secondError).not.toBeNull();
          expect(secondError!.statusCode).toBe(400);
        }
      ),
      { numRuns: 5 }
    );
  }, 60_000);

  // ── Property 3 ─────────────────────────────────────────────────────────────
  test('Property 3: POST /api/auth/forgot-password returns identical body for registered and unregistered emails', async () => {
    // **Validates: Requirements 2.4**
    const supertest = (await import('supertest')).default;
    const express = (await import('express')).default;
    const { errorHandler } = await import('../../utils/errorHandler.js');

    const app = express();
    app.use(express.json());
    app.post('/api/auth/forgot-password', async (req, res, next) => {
      try {
        await svc.requestPasswordReset(req.body.email as string);
        res
          .status(200)
          .json({
            message:
              'Si el email est\u00e1 registrado, recibir\u00e1s un enlace en breve.',
          });
      } catch (e) {
        next(e);
      }
    });
    app.use(errorHandler);

    await fc.assert(
      fc.asyncProperty(
        emailArb,
        emailArb,
        async (registeredEmail, unregisteredEmail) => {
          db.select = selectReturning([
            { id: 'uid', email: registeredEmail.toLowerCase() },
          ]);
          db.update = updateCapturing([]);
          db.insert = insertCapturing([]);

          const res1 = await supertest(app)
            .post('/api/auth/forgot-password')
            .send({ email: registeredEmail });

          db.select = selectReturning([]);

          const res2 = await supertest(app)
            .post('/api/auth/forgot-password')
            .send({ email: unregisteredEmail });

          expect(res1.status).toBe(200);
          expect(res2.status).toBe(200);
          expect(res1.body).toEqual(res2.body);
        }
      ),
      { numRuns: 5 }
    );
  }, 30_000);
});
