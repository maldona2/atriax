import { and, asc, eq, lte, or, isNull } from 'drizzle-orm';
import { db, calendarSyncQueue } from '../db/client.js';
import { googleCalendarConfig } from '../config/googleCalendar.js';
import logger from '../utils/logger.js';

export type SyncOperation = 'create' | 'update' | 'delete' | 'batch_sync';
export type QueueJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface EnqueueJobInput {
  tenantId: string;
  userId: string;
  appointmentId?: string;
  operation: SyncOperation;
  priority?: number;
  payload?: Record<string, unknown>;
}

export interface QueueJob {
  id: string;
  tenantId: string;
  userId: string;
  appointmentId: string | null;
  operation: SyncOperation;
  priority: number;
  status: QueueJobStatus;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date | null;
  payload: unknown;
  errorMessage: string | null;
  createdAt: Date | null;
}

export class SyncQueue {
  calculateBackoffMs(retryCount: number): number {
    const { initialBackoffMs } = googleCalendarConfig.sync;
    const jitter = Math.random() * 0.2 * initialBackoffMs;
    return Math.pow(2, retryCount) * initialBackoffMs + jitter;
  }

  async enqueue(input: EnqueueJobInput): Promise<QueueJob> {
    const [job] = await db
      .insert(calendarSyncQueue)
      .values({
        tenantId: input.tenantId,
        userId: input.userId,
        appointmentId: input.appointmentId ?? null,
        operation: input.operation,
        priority: input.priority ?? 5,
        status: 'pending',
        retryCount: 0,
        maxRetries: googleCalendarConfig.sync.maxRetries,
        payload: input.payload ?? null,
      })
      .returning();

    if (!job) throw new Error('Failed to enqueue sync job');

    logger.info(
      { jobId: job.id, operation: input.operation, userId: input.userId },
      'Sync job enqueued'
    );

    return this.toQueueJob(job);
  }

  async processNext(): Promise<QueueJob | null> {
    const now = new Date();

    const [job] = await db
      .select()
      .from(calendarSyncQueue)
      .where(
        and(
          eq(calendarSyncQueue.status, 'pending'),
          or(
            isNull(calendarSyncQueue.nextRetryAt),
            lte(calendarSyncQueue.nextRetryAt, now)
          )
        )
      )
      .orderBy(
        asc(calendarSyncQueue.priority),
        asc(calendarSyncQueue.createdAt)
      )
      .limit(1);

    if (!job) return null;

    const [updated] = await db
      .update(calendarSyncQueue)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(
        and(
          eq(calendarSyncQueue.id, job.id),
          eq(calendarSyncQueue.status, 'pending')
        )
      )
      .returning();

    return updated ? this.toQueueJob(updated) : null;
  }

  async markCompleted(jobId: string): Promise<void> {
    await db
      .update(calendarSyncQueue)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(calendarSyncQueue.id, jobId));
  }

  async retry(jobId: string, errorMessage: string): Promise<void> {
    const [job] = await db
      .select()
      .from(calendarSyncQueue)
      .where(eq(calendarSyncQueue.id, jobId))
      .limit(1);

    if (!job) return;

    const newRetryCount = job.retryCount + 1;

    if (newRetryCount >= job.maxRetries) {
      await db
        .update(calendarSyncQueue)
        .set({
          status: 'failed',
          retryCount: newRetryCount,
          errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(calendarSyncQueue.id, jobId));

      logger.error(
        { jobId, retryCount: newRetryCount, errorMessage },
        'Sync job exhausted retries, marked as failed'
      );
      return;
    }

    const backoffMs = this.calculateBackoffMs(newRetryCount);
    const nextRetryAt = new Date(Date.now() + backoffMs);

    await db
      .update(calendarSyncQueue)
      .set({
        status: 'pending',
        retryCount: newRetryCount,
        nextRetryAt,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(calendarSyncQueue.id, jobId));

    logger.warn(
      { jobId, retryCount: newRetryCount, backoffMs, nextRetryAt },
      'Sync job scheduled for retry'
    );
  }

  async markFailed(jobId: string, errorMessage: string): Promise<void> {
    await db
      .update(calendarSyncQueue)
      .set({
        status: 'failed',
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(calendarSyncQueue.id, jobId));
  }

  private toQueueJob(row: typeof calendarSyncQueue.$inferSelect): QueueJob {
    return {
      id: row.id,
      tenantId: row.tenantId,
      userId: row.userId,
      appointmentId: row.appointmentId,
      operation: row.operation as SyncOperation,
      priority: row.priority,
      status: row.status as QueueJobStatus,
      retryCount: row.retryCount,
      maxRetries: row.maxRetries,
      nextRetryAt: row.nextRetryAt,
      payload: row.payload,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
    };
  }
}

export const syncQueue = new SyncQueue();
