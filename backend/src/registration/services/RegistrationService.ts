import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { eq, sql } from 'drizzle-orm';
import {
  db,
  tenants,
  users,
  verificationTokens,
  patientCounts,
} from '../../db/client.js';
import type {
  RegistrationRequest,
  RegistrationResponse,
  VerificationResponse,
  ResendResponse,
  RegistrationData,
  User,
} from '../models';
import type {
  RegistrationAPI,
  DataValidator,
  EmailService,
} from '../interfaces';

/**
 * Concrete implementation of the RegistrationAPI.
 *
 * Orchestrates validation, tenant + user creation, free tier setup
 * (via user.subscriptionPlan = 'free' and patient_counts row),
 * and email verification token handling.
 */
export class RegistrationService implements RegistrationAPI {
  private readonly validator: DataValidator;
  private readonly emailService: EmailService;

  constructor(validator: DataValidator, emailService: EmailService) {
    this.validator = validator;
    this.emailService = emailService;
  }

  async registerUser(
    registrationData: RegistrationRequest
  ): Promise<RegistrationResponse> {
    const data: RegistrationData = { ...registrationData };

    // Run validation
    const requiredResult = this.validator.validateRequiredFields(data);
    if (!requiredResult.valid) {
      return {
        success: false,
        message: 'Validation failed',
        errors: requiredResult.errors,
      };
    }

    const emailResult = await this.validator.validateEmail(data.email);
    const passwordResult = this.validator.validatePassword(data.password);
    const confirmResult = this.validator.validatePasswordConfirmation(
      data.password,
      data.confirmPassword
    );

    const errors = [
      ...emailResult.errors,
      ...passwordResult.errors,
      ...confirmResult.errors,
    ];
    if (errors.length > 0) {
      return {
        success: false,
        message: 'Validation failed',
        errors,
      };
    }

    const emailLower = data.email.trim().toLowerCase();

    // Check for existing user with same email (case-insensitive)
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${emailLower}`)
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        message: 'Ya existe una cuenta con ese email.',
        errors: ['Ya existe una cuenta con ese email.'],
      };
    }

    // Create tenant + user + patient_counts + verification token in a transaction
    const now = new Date();
    const passwordHash = await bcrypt.hash(data.password, 12);

    const result = await db.transaction(async (tx) => {
      // Create a dedicated tenant for this self-registered professional
      const tenantId = uuidv4();
      const tenantName = `${data.firstName} ${data.lastName}`.trim();
      const slugBase = `${data.firstName}-${data.lastName}`.trim() || 'tenant';
      const slugSafe = slugBase
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const slug = `${slugSafe || 'tenant'}-${tenantId.slice(0, 8)}`;

      const [tenant] = await tx
        .insert(tenants)
        .values({
          id: tenantId,
          name: tenantName || slug,
          slug,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const [user] = await tx
        .insert(users)
        .values({
          id: uuidv4(),
          tenantId: tenant.id,
          email: emailLower,
          passwordHash,
          // firstName / lastName columns may not exist in all deployed DBs yet;
          // rely on fullName only to stay compatible.
          fullName: `${data.firstName} ${data.lastName}`.trim(),
          role: 'professional',
          isActive: true,
          isVerified: false,
          subscriptionPlan: 'free',
          subscriptionStatus: 'active',
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // Initialize patient count for this user
      await tx.insert(patientCounts).values({
        userId: user.id,
        count: 0,
        lastUpdated: now,
      });

      // Create verification token (24h expiry)
      const token = uuidv4();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await tx.insert(verificationTokens).values({
        id: uuidv4(),
        userId: user.id,
        token,
        expiresAt,
        used: false,
        createdAt: now,
      });

      const publicUser: Partial<User> = {
        id: user.id,
        email: user.email,
        // firstName/lastName may not be persisted; expose from input instead
        firstName: data.firstName,
        lastName: data.lastName,
        isVerified: user.isVerified,
        tenantId: user.tenantId ?? undefined,
      };

      return { user: publicUser, token };
    });

    // Send verification email outside the transaction
    try {
      await this.emailService.sendVerificationEmail(
        emailLower,
        result.token,
        registrationData.firstName
      );
    } catch {
      // We still consider registration successful even if email sending fails;
      // clients can request a resend.
    }

    return {
      success: true,
      message:
        'Registro exitoso. Revisa tu email para verificar tu cuenta antes de iniciar sesión.',
      user: result.user,
    };
  }

  async verifyEmail(token: string): Promise<VerificationResponse> {
    const validation = await this.emailService.validateVerificationToken(token);

    if (!validation.valid || !validation.userId) {
      return {
        success: false,
        message: validation.message || 'Invalid or expired verification token.',
      };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ isVerified: true, updatedAt: new Date() })
        .where(eq(users.id, validation.userId!));

      await this.emailService.markTokenAsUsed(token);
    });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, validation.userId))
      .limit(1);

    const publicUser: Partial<User> | undefined = user
      ? {
          id: user.id,
          email: user.email,
          isVerified: user.isVerified,
          tenantId: user.tenantId ?? undefined,
        }
      : undefined;

    return {
      success: true,
      message: 'Email verified successfully. You can now log in.',
      user: publicUser,
    };
  }

  async resendVerification(email: string): Promise<ResendResponse> {
    const emailLower = email.trim().toLowerCase();

    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${emailLower}`)
      .limit(1);

    if (!user) {
      return {
        success: false,
        message: 'If an account exists for this email, a verification link will be sent.',
      };
    }

    if (user.isVerified) {
      return {
        success: true,
        message: 'Account is already verified. You can log in.',
      };
    }

    const now = new Date();
    const token = uuidv4();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await db.insert(verificationTokens).values({
      id: uuidv4(),
      userId: user.id,
      token,
      expiresAt,
      used: false,
      createdAt: now,
    });

    await this.emailService.sendVerificationEmail(
      emailLower,
      token,
      user.fullName ?? ''
    );

    return {
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    };
  }
}

