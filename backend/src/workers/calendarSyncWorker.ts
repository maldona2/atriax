import { syncQueue, QueueJob } from '../services/syncQueue.js';
import { calendarSyncService } from '../services/calendarSyncService.js';
import { calendarSyncMonitor } from '../services/calendarSyncMonitor.js';
import { googleCalendarConfig } from '../config/googleCalendar.js';
import logger from '../utils/logger.js';

let isRunning = false;
let shutdownRequested = false;
let workerTimer: ReturnType<typeof setTimeout> | null = null;

async function processJob(job: QueueJob): Promise<void> {
  logger.info(
    { jobId: job.id, operation: job.operation, userId: job.userId },
    'Processing calendar sync job'
  );

  try {
    switch (job.operation) {
      case 'create':
      case 'update': {
        if (!job.appointmentId) {
          throw new Error(
            `Job ${job.id} has no appointmentId for operation ${job.operation}`
          );
        }
        const result = await calendarSyncService.syncAppointment(
          job.appointmentId,
          job.tenantId,
          job.userId
        );
        if (!result.success) {
          throw new Error(result.error ?? 'Sync failed');
        }
        calendarSyncMonitor.recordSuccess();
        break;
      }

      case 'delete': {
        if (!job.appointmentId) {
          throw new Error(
            `Job ${job.id} has no appointmentId for delete operation`
          );
        }
        const result = await calendarSyncService.deleteCalendarEvent(
          job.appointmentId,
          job.tenantId,
          job.userId
        );
        if (!result.success) {
          throw new Error(result.error ?? 'Delete failed');
        }
        calendarSyncMonitor.recordSuccess();
        break;
      }

      case 'batch_sync': {
        const batchResult = await calendarSyncService.syncAllAppointments(
          job.tenantId,
          job.userId
        );
        logger.info(batchResult, 'Batch sync completed via worker');
        break;
      }

      default:
        throw new Error(`Unknown operation: ${job.operation}`);
    }

    await syncQueue.markCompleted(job.id);
    logger.info({ jobId: job.id }, 'Calendar sync job completed');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    calendarSyncMonitor.recordFailure(errorMessage);

    logger.error({ jobId: job.id, err }, 'Calendar sync job failed');
    await syncQueue.retry(job.id, errorMessage);
  }
}

async function runLoop(): Promise<void> {
  if (shutdownRequested) {
    isRunning = false;
    logger.info('Calendar sync worker shut down gracefully');
    return;
  }

  try {
    const job = await syncQueue.processNext();

    if (job) {
      await processJob(job);
      setImmediate(runLoop);
    } else {
      workerTimer = setTimeout(
        runLoop,
        googleCalendarConfig.sync.workerIntervalMs
      );
    }
  } catch (err) {
    logger.error({ err }, 'Calendar sync worker loop error');
    workerTimer = setTimeout(
      runLoop,
      googleCalendarConfig.sync.workerIntervalMs
    );
  }
}

export function startCalendarSyncWorker(): void {
  if (isRunning) {
    logger.warn('Calendar sync worker already running');
    return;
  }
  isRunning = true;
  shutdownRequested = false;
  logger.info('Calendar sync worker started');
  void runLoop();
}

export function stopCalendarSyncWorker(): Promise<void> {
  return new Promise((resolve) => {
    shutdownRequested = true;
    if (workerTimer) {
      clearTimeout(workerTimer);
      workerTimer = null;
    }
    if (!isRunning) {
      resolve();
      return;
    }
    const checkInterval = setInterval(() => {
      if (!isRunning) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });
}
