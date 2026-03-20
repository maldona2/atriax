import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { eq, and } from 'drizzle-orm';
import { db, users, passwordResetTokens } from '../db/client.js';
import { sendPasswordResetEmail } from './mailService.js';
import logger from '../utils/logger.js';

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const CONSTANT_TIME_DELAY_MS = 200; // artificial delay for timing-attack prevention

const FRONTEND_BASE_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function makeError(message: string, statusCode: number): Error {
  const err = new Error(message);
  (err as Error & { statusCode?: number }).statusCode = statusCode;
  return err;
}

/**
 * Requests a password reset for the given email.
 *
 * Always returns the same generic response regardless of whether the email
 * exists, to prevent user enumeration (Requirement 2.4 / 6.3).
 *
 * A fixed artificial delay is applied so that the response time is uniform
 * whether or not the user was found (Requirement 6.3).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const start = Date.now();

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (user) {
      // Generate raw token (256 bits of entropy)
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

      // Invalidate all previous pending (unused) tokens for this user
      await db
        .update(passwordResetTokens)
        .set({ used: true })
        .where(
          and(
            eq(passwordResetTokens.userId, user.id),
            eq(passwordResetTokens.used, false)
          )
        );

      // Store the new token hash
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt,
        used: false,
      });

      // Send the reset email — errors are caught and logged, not propagated
      const resetUrl = `${FRONTEND_BASE_URL}/reset-password?token=${rawToken}`;
      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (mailErr) {
        logger.error(
          { err: mailErr },
          'Failed to send password reset email to %s',
          email
        );
      }
    }
  } catch (err) {
    // Log unexpected DB errors but do not expose them
    logger.error({ err }, 'Error during requestPasswordReset for %s', email);
  } finally {
    // Ensure constant-time response regardless of code path taken
    const elapsed = Date.now() - start;
    const remaining = CONSTANT_TIME_DELAY_MS - elapsed;
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  }
}

/**
 * Validates a raw reset token.
 *
 * Throws a 400 error if the token is not found, expired, or already used
 * (Requirement 3.4 / 3.5).
 */
export async function validateResetToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record || record.used || record.expiresAt < new Date()) {
    throw makeError(
      'El enlace de recuperación no es válido o ha expirado.',
      400
    );
  }
}

/**
 * Resets the user's password using a valid raw token.
 *
 * Validates the token, updates the user's passwordHash with a bcrypt hash of
 * the new password, and marks the token as used (Requirements 3.6 / 4.6).
 */
export async function resetPassword(
  rawToken: string,
  newPassword: string
): Promise<void> {
  const tokenHash = hashToken(rawToken);

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record || record.used || record.expiresAt < new Date()) {
    throw makeError(
      'El enlace de recuperación no es válido o ha expirado.',
      400
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, record.userId));

  await db
    .update(passwordResetTokens)
    .set({ used: true })
    .where(eq(passwordResetTokens.id, record.id));
}
