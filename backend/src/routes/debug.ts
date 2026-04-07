import { Router } from 'express';
import { sendReminders } from '../jobs/reminderJob.js';
import { getDailyReminderCount } from '../services/reminderService.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * Manual trigger for reminder job (for debugging)
 * GET /api/debug/reminders/trigger
 */
router.get('/reminders/trigger', async (req, res) => {
  try {
    logger.info('Manual reminder job triggered via API');
    await sendReminders();
    res.json({ success: true, message: 'Reminder job executed' });
  } catch (error) {
    logger.error({ error }, 'Manual reminder job failed');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get reminder statistics
 * GET /api/debug/reminders/stats
 */
router.get('/reminders/stats', async (req, res) => {
  try {
    const today = new Date();
    const count = await getDailyReminderCount(today);

    res.json({
      success: true,
      data: {
        todayCount: count,
        serverTime: today.toISOString(),
        cronSchedule: process.env.REMINDER_CRON_SCHEDULE ?? '0 9 * * *',
        resendConfigured: !!process.env.RESEND_API_KEY,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get reminder stats');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
