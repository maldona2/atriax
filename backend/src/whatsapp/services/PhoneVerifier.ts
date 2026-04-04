/**
 * PhoneVerifier - OTP-based verification for linking a doctor's WhatsApp
 * Business phone number to their Power Med account.
 *
 * Flow:
 *   1. initiateVerification() — generates a 6-digit OTP, hashes it, stores it,
 *      sends it via WhatsApp.
 *   2. confirmVerification() — compares the supplied code against the hash,
 *      marks the record as verified.
 *
 * Security:
 *   - OTP stored as bcrypt hash (never in plaintext)
 *   - 10-minute expiry
 *   - Max 3 attempts before lockout
 *   - Phone number must be unique across verified users
 */

import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { and, eq, ne, desc } from 'drizzle-orm';
import { db, whatsappVerifications } from '../../db/client.js';
import type { PhoneVerificationResult } from '../types.js';
import { MetaAPIClient } from './MetaAPIClient.js';
import logger from '../../utils/logger.js';

const OTP_EXPIRY_MS = 10 * 60 * 1_000; // 10 minutes
const MAX_ATTEMPTS = 3;
const BCRYPT_ROUNDS = 10;

export class PhoneVerifier {
  private readonly metaClient: MetaAPIClient;

  constructor(metaClient = new MetaAPIClient()) {
    this.metaClient = metaClient;
  }

  /**
   * Initiates phone verification: generates OTP, stores hash, sends via WhatsApp.
   */
  async initiateVerification(
    tenantId: string,
    userId: string,
    phoneNumber: string
  ): Promise<PhoneVerificationResult> {
    const normalised = MetaAPIClient.normalisePhone(phoneNumber);

    // Check uniqueness: reject if another *verified* user already owns this number
    const [alreadyOwned] = await db
      .select({ id: whatsappVerifications.id })
      .from(whatsappVerifications)
      .where(
        and(
          eq(whatsappVerifications.phoneNumber, normalised),
          eq(whatsappVerifications.isVerified, true),
          ne(whatsappVerifications.userId, userId)
        )
      )
      .limit(1);

    if (alreadyOwned) {
      return {
        success: false,
        message: 'Este número de WhatsApp ya está asociado a otra cuenta.',
      };
    }

    const otp = this._generateOtp();
    const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await db.insert(whatsappVerifications).values({
      tenantId,
      userId,
      phoneNumber: normalised,
      otpHash,
      expiresAt,
    });

    const sent = await this.metaClient.sendVerificationCode(normalised, otp);
    if (!sent.success) {
      logger.error(
        { userId, phoneNumber: normalised },
        'PhoneVerifier: failed to send OTP'
      );
      return {
        success: false,
        message:
          'No se pudo enviar el código de verificación. Intente nuevamente.',
      };
    }

    logger.info({ userId, phoneNumber: normalised }, 'PhoneVerifier: OTP sent');
    return {
      success: true,
      message:
        'Se envió un código de 6 dígitos al número de WhatsApp indicado.',
    };
  }

  /**
   * Confirms a verification attempt by comparing the supplied OTP to the stored hash.
   */
  async confirmVerification(
    userId: string,
    phoneNumber: string,
    otp: string
  ): Promise<PhoneVerificationResult> {
    const normalised = MetaAPIClient.normalisePhone(phoneNumber);

    const [record] = await db
      .select()
      .from(whatsappVerifications)
      .where(
        and(
          eq(whatsappVerifications.userId, userId),
          eq(whatsappVerifications.phoneNumber, normalised),
          eq(whatsappVerifications.isVerified, false)
        )
      )
      .orderBy(desc(whatsappVerifications.createdAt))
      .limit(1);

    if (!record) {
      return {
        success: false,
        message: 'No se encontró una verificación pendiente para este número.',
      };
    }

    if (record.expiresAt < new Date()) {
      return {
        success: false,
        message: 'El código ha expirado. Por favor, solicita uno nuevo.',
      };
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      return {
        success: false,
        message:
          'Se superó el máximo de intentos. Por favor, solicita un nuevo código.',
      };
    }

    // Increment attempt count first to prevent brute force
    await db
      .update(whatsappVerifications)
      .set({ attempts: record.attempts + 1 })
      .where(eq(whatsappVerifications.id, record.id));

    const match = await bcrypt.compare(otp, record.otpHash);
    if (!match) {
      const remaining = MAX_ATTEMPTS - (record.attempts + 1);
      return {
        success: false,
        message: `Código incorrecto. ${remaining > 0 ? `Te quedan ${remaining} intento(s).` : 'No quedan más intentos.'}`,
      };
    }

    await db
      .update(whatsappVerifications)
      .set({ isVerified: true, verifiedAt: new Date() })
      .where(eq(whatsappVerifications.id, record.id));

    logger.info(
      { userId, phoneNumber: normalised },
      'PhoneVerifier: phone verified'
    );
    return {
      success: true,
      message: 'Número de WhatsApp verificado correctamente.',
    };
  }

  /**
   * Returns the verified phone number for a user, or null if none.
   */
  async getVerifiedPhone(userId: string): Promise<string | null> {
    const [record] = await db
      .select({ phoneNumber: whatsappVerifications.phoneNumber })
      .from(whatsappVerifications)
      .where(
        and(
          eq(whatsappVerifications.userId, userId),
          eq(whatsappVerifications.isVerified, true)
        )
      )
      .orderBy(desc(whatsappVerifications.verifiedAt))
      .limit(1);

    return record?.phoneNumber ?? null;
  }

  /**
   * Returns true if the user has a verified WhatsApp phone number.
   */
  async isVerified(userId: string): Promise<boolean> {
    const phone = await this.getVerifiedPhone(userId);
    return phone !== null;
  }

  private _generateOtp(): string {
    // Cryptographically secure 6-digit code (100000–999999)
    return String(randomInt(100_000, 1_000_000));
  }
}
