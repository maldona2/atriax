import { eq, and, gte } from 'drizzle-orm';
import { db, calendarSyncStatus } from '../db/client.js';
import { googleCalendarConfig } from '../config/googleCalendar.js';
import logger from '../utils/logger.js';

interface SyncMetrics {
  total: number;
  synced: number;
  failed: number;
  pending: number;
  unsynced: number;
  successRate: number;
  windowStart: Date;
}

export class CalendarSyncMonitor {
  private metrics: SyncMetrics = {
    total: 0,
    synced: 0,
    failed: 0,
    pending: 0,
    unsynced: 0,
    successRate: 1,
    windowStart: new Date(),
  };

  recordSuccess(): void {
    this.metrics.total++;
    this.metrics.synced++;
    this.updateSuccessRate();
    this.checkAlertThreshold();
  }

  recordFailure(errorMessage: string): void {
    this.metrics.total++;
    this.metrics.failed++;
    this.updateSuccessRate();
    logger.error(
      { errorMessage, metrics: this.metrics },
      'Calendar sync failure recorded'
    );
    this.checkAlertThreshold();
  }

  private updateSuccessRate(): void {
    this.metrics.successRate =
      this.metrics.total > 0 ? this.metrics.synced / this.metrics.total : 1;
  }

  private checkAlertThreshold(): void {
    const failureRate = 1 - this.metrics.successRate;
    const threshold = googleCalendarConfig.monitoring.alertFailureRateThreshold;

    if (this.metrics.total >= 10 && failureRate > threshold) {
      logger.error(
        {
          failureRate: (failureRate * 100).toFixed(1) + '%',
          threshold: (threshold * 100).toFixed(1) + '%',
          metrics: this.metrics,
        },
        'ALERT: Google Calendar sync failure rate exceeds threshold'
      );
    }
  }

  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  resetWindow(): void {
    this.metrics = {
      total: 0,
      synced: 0,
      failed: 0,
      pending: 0,
      unsynced: 0,
      successRate: 1,
      windowStart: new Date(),
    };
  }

  async getDbMetrics(tenantId: string): Promise<Record<string, number>> {
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rows = await db
      .select({ status: calendarSyncStatus.status })
      .from(calendarSyncStatus)
      .where(
        and(
          eq(calendarSyncStatus.tenantId, tenantId),
          gte(calendarSyncStatus.updatedAt, windowStart)
        )
      );

    const counts: Record<string, number> = {
      synced: 0,
      failed: 0,
      pending: 0,
      unsynced: 0,
    };

    for (const row of rows) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }

    return counts;
  }
}

export const calendarSyncMonitor = new CalendarSyncMonitor();
