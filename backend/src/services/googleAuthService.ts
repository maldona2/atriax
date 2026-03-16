import crypto from 'crypto';
import { google } from 'googleapis';
import { eq } from 'drizzle-orm';
import { db, googleCalendarTokens } from '../db/client.js';
import { googleCalendarConfig } from '../config/googleCalendar.js';
import logger from '../utils/logger.js';

// ─── Encryption helpers ───────────────────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const keyHex = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      'GOOGLE_TOKEN_ENCRYPTION_KEY environment variable is not set'
    );
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error(
      'GOOGLE_TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)'
    );
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    googleCalendarConfig.encryption.algorithm,
    key,
    iv
  );
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid ciphertext format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(
    googleCalendarConfig.encryption.algorithm,
    key,
    iv
  );
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

// ─── GoogleAuthService ────────────────────────────────────────────────────────

export class GoogleAuthService {
  private createOAuthClient() {
    return new google.auth.OAuth2(
      googleCalendarConfig.clientId,
      googleCalendarConfig.clientSecret,
      googleCalendarConfig.redirectUri
    );
  }

  getAuthorizationUrl(userId: string): string {
    const oauth2Client = this.createOAuthClient();
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64url');
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: googleCalendarConfig.scopes,
      state,
      prompt: 'consent',
    });
  }

  async handleCallback(
    code: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    const oauth2Client = this.createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;
    const tokenExpiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : null;

    const existing = await db
      .select({ id: googleCalendarTokens.id })
      .from(googleCalendarTokens)
      .where(eq(googleCalendarTokens.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(googleCalendarTokens)
        .set({
          encryptedAccessToken,
          ...(encryptedRefreshToken && { encryptedRefreshToken }),
          tokenExpiresAt,
          scope: tokens.scope ?? null,
          updatedAt: new Date(),
        })
        .where(eq(googleCalendarTokens.userId, userId));
    } else {
      await db.insert(googleCalendarTokens).values({
        userId,
        tenantId,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        scope: tokens.scope ?? null,
      });
    }

    logger.info({ userId }, 'Google Calendar OAuth tokens stored');
  }

  async getAccessToken(userId: string): Promise<string> {
    const [tokenRow] = await db
      .select()
      .from(googleCalendarTokens)
      .where(eq(googleCalendarTokens.userId, userId))
      .limit(1);

    if (!tokenRow) {
      throw new Error(`No Google Calendar token found for user ${userId}`);
    }

    const now = new Date();
    const bufferMs = 5 * 60 * 1000;
    const isExpired =
      tokenRow.tokenExpiresAt &&
      tokenRow.tokenExpiresAt.getTime() - bufferMs < now.getTime();

    if (!isExpired) {
      return decrypt(tokenRow.encryptedAccessToken);
    }

    if (!tokenRow.encryptedRefreshToken) {
      throw new Error(
        `Google Calendar token expired and no refresh token available for user ${userId}`
      );
    }

    logger.info({ userId }, 'Refreshing Google Calendar access token');

    const oauth2Client = this.createOAuthClient();
    oauth2Client.setCredentials({
      refresh_token: decrypt(tokenRow.encryptedRefreshToken),
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to refresh Google Calendar access token');
    }

    const encryptedAccessToken = encrypt(credentials.access_token);
    const tokenExpiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : null;

    await db
      .update(googleCalendarTokens)
      .set({
        encryptedAccessToken,
        tokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarTokens.userId, userId));

    logger.info({ userId }, 'Google Calendar access token refreshed');

    return credentials.access_token;
  }

  async isConnected(userId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: googleCalendarTokens.id })
      .from(googleCalendarTokens)
      .where(eq(googleCalendarTokens.userId, userId))
      .limit(1);
    return !!row;
  }

  async getConnectionInfo(
    userId: string
  ): Promise<{ connected: boolean; tokenExpiresAt: Date | null } | null> {
    const [row] = await db
      .select({
        tokenExpiresAt: googleCalendarTokens.tokenExpiresAt,
      })
      .from(googleCalendarTokens)
      .where(eq(googleCalendarTokens.userId, userId))
      .limit(1);

    if (!row) return { connected: false, tokenExpiresAt: null };
    return { connected: true, tokenExpiresAt: row.tokenExpiresAt };
  }

  async disconnect(userId: string): Promise<void> {
    const [tokenRow] = await db
      .select()
      .from(googleCalendarTokens)
      .where(eq(googleCalendarTokens.userId, userId))
      .limit(1);

    if (!tokenRow) return;

    try {
      const oauth2Client = this.createOAuthClient();
      const accessToken = decrypt(tokenRow.encryptedAccessToken);
      await oauth2Client.revokeToken(accessToken);
      logger.info({ userId }, 'Google Calendar OAuth token revoked');
    } catch (err) {
      logger.warn({ userId, err }, 'Failed to revoke Google Calendar token');
    }

    await db
      .delete(googleCalendarTokens)
      .where(eq(googleCalendarTokens.userId, userId));

    logger.info({ userId }, 'Google Calendar token removed from database');
  }
}

export const googleAuthService = new GoogleAuthService();
