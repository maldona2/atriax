/**
 * SessionManager - Database-backed conversation context for the WhatsApp bot.
 *
 * Unlike the web chatbot (which uses browser sessionStorage), WhatsApp sessions
 * are persisted in PostgreSQL so they survive server restarts and allow
 * multi-device continuity.
 *
 * Sessions expire after 24 hours of inactivity.
 */

import { and, eq, lt } from 'drizzle-orm';
import { db, whatsappSessions } from '../../db/client.js';
import type { ConversationContext } from '../../chatbot/types.js';
import { clearContext } from '../../chatbot/services/ConversationManager.js';
import logger from '../../utils/logger.js';

const SESSION_TTL_MS = 24 * 60 * 60 * 1_000; // 24 h

export class SessionManager {
  /**
   * Retrieves the conversation context for a given tenant + patient phone.
   * Returns an empty context if no active session exists.
   */
  async getContext(
    tenantId: string,
    phoneNumber: string
  ): Promise<ConversationContext> {
    try {
      const [row] = await db
        .select()
        .from(whatsappSessions)
        .where(
          and(
            eq(whatsappSessions.tenantId, tenantId),
            eq(whatsappSessions.phoneNumber, phoneNumber)
          )
        )
        .limit(1);

      if (!row) return clearContext();

      // Treat expired sessions as empty
      if (row.expiresAt < new Date()) {
        await this._deleteSession(tenantId, phoneNumber);
        return clearContext();
      }

      return (row.context as ConversationContext) ?? clearContext();
    } catch (err) {
      logger.error(
        { err, tenantId, phoneNumber },
        'SessionManager: getContext failed'
      );
      return clearContext();
    }
  }

  /**
   * Persists (upserts) the conversation context for a given tenant + patient phone.
   * Resets the 24-hour TTL on every call.
   */
  async saveContext(
    tenantId: string,
    phoneNumber: string,
    context: ConversationContext
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    try {
      const [existing] = await db
        .select({ id: whatsappSessions.id })
        .from(whatsappSessions)
        .where(
          and(
            eq(whatsappSessions.tenantId, tenantId),
            eq(whatsappSessions.phoneNumber, phoneNumber)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(whatsappSessions)
          .set({
            context: context as Record<string, unknown>,
            lastMessageAt: now,
            expiresAt,
            updatedAt: now,
          })
          .where(eq(whatsappSessions.id, existing.id));
      } else {
        await db.insert(whatsappSessions).values({
          tenantId,
          phoneNumber,
          context: context as Record<string, unknown>,
          lastMessageAt: now,
          expiresAt,
        });
      }
    } catch (err) {
      logger.error(
        { err, tenantId, phoneNumber },
        'SessionManager: saveContext failed'
      );
    }
  }

  /**
   * Deletes sessions whose expiresAt is in the past.
   * Call this from the scheduled cleanup job.
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await db
        .delete(whatsappSessions)
        .where(lt(whatsappSessions.expiresAt, new Date()))
        .returning({ id: whatsappSessions.id });

      logger.info(
        { deleted: result.length },
        'SessionManager: cleaned up expired sessions'
      );
      return result.length;
    } catch (err) {
      logger.error({ err }, 'SessionManager: cleanupExpiredSessions failed');
      return 0;
    }
  }

  private async _deleteSession(
    tenantId: string,
    phoneNumber: string
  ): Promise<void> {
    await db
      .delete(whatsappSessions)
      .where(
        and(
          eq(whatsappSessions.tenantId, tenantId),
          eq(whatsappSessions.phoneNumber, phoneNumber)
        )
      );
  }
}
