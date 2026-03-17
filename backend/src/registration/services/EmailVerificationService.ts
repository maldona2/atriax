import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db, verificationTokens } from '../../db/client.js';
import type { EmailService } from '../interfaces/EmailService';
import type { TokenValidation } from '../models';

/**
 * Simple EmailService implementation.
 *
 * For now this logs verification links to the server console.
 * It can be wired to a real provider (Resend, SendGrid, etc.) later.
 */
export class EmailVerificationService implements EmailService {
  private readonly frontendUrl: string;

  constructor() {
    this.frontendUrl =
      process.env.FRONTEND_URL ?? 'http://localhost:3000';
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    firstName: string
  ): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${encodeURIComponent(
      token
    )}`;

    // eslint-disable-next-line no-console
    console.log(
      `[EmailVerificationService] Sending verification email to ${email} for ${firstName}. Link: ${verifyUrl}`
    );
  }

  async generateVerificationToken(userId: string): Promise<string> {
    const token = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await db.insert(verificationTokens).values({
      id: uuidv4(),
      userId,
      token,
      expiresAt,
      used: false,
      createdAt: now,
    });

    return token;
  }

  async validateVerificationToken(token: string): Promise<TokenValidation> {
    const [row] = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.token, token))
      .limit(1);

    if (!row) {
      return {
        valid: false,
        expired: false,
        used: false,
        message: 'Verification token not found.',
      };
    }

    const now = new Date();
    const expired = row.expiresAt <= now;

    return {
      valid: !expired && !row.used,
      userId: row.userId,
      expired,
      used: row.used,
      message: expired
        ? 'Verification token has expired.'
        : row.used
          ? 'Verification token has already been used.'
          : undefined,
    };
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      `[EmailVerificationService] Sending welcome email to ${email} for ${firstName}.`
    );
  }

  async markTokenAsUsed(token: string): Promise<void> {
    await db
      .update(verificationTokens)
      .set({ used: true })
      .where(eq(verificationTokens.token, token));
  }
}

