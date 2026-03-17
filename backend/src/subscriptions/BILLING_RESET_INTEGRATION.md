# Billing Reset Job Integration Guide

## Overview

The Billing Reset Job provides functionality to reset monthly usage counters (tokens and costs) for all users at billing period boundaries. This is a critical component for enforcing subscription limits on a monthly basis.

## What It Does

The job performs the following operations:
- Resets `tokens_used_monthly` to 0 for all users
- Resets `cost_used_monthly_usd` to '0' for all users
- Updates `billing_month` field to current month in YYYY-MM format

## API

### `runMonthlyBillingReset()`

Main entry point for the scheduled job. Checks if a reset is needed and performs it if necessary.

```typescript
import { runMonthlyBillingReset } from './subscriptions/index.js';

const result = await runMonthlyBillingReset();
console.log(result);
// { resetPerformed: true, usersUpdated: 150 }
```

**Returns:**
- `resetPerformed`: boolean - Whether the reset was performed
- `usersUpdated`: number - Count of users updated (0 if reset not needed)

### `resetMonthlyUsage()`

Directly resets monthly usage for all users without checking if needed.

```typescript
import { resetMonthlyUsage } from './subscriptions/index.js';

const count = await resetMonthlyUsage();
console.log(`Updated ${count} users`);
```

**Returns:** Number of users updated

### `isMonthlyResetNeeded()`

Checks if any users need a monthly reset (have a different billing month than current).

```typescript
import { isMonthlyResetNeeded } from './subscriptions/index.js';

const needed = await isMonthlyResetNeeded();
if (needed) {
  console.log('Reset is needed');
}
```

**Returns:** boolean - True if reset is needed

## Integration with Cron Scheduler

### Option 1: Run at the start of each month (Recommended)

Add to `backend/src/index.ts`:

```typescript
import cron from 'node-cron';
import { runMonthlyBillingReset } from './subscriptions/index.js';
import logger from './utils/logger.js';

// Run at 00:01 on the 1st day of every month
cron.schedule('1 0 1 * *', async () => {
  logger.info('Cron: running monthly billing reset job');
  try {
    const result = await runMonthlyBillingReset();
    logger.info(result, 'Monthly billing reset completed');
  } catch (error) {
    logger.error({ error }, 'Monthly billing reset failed');
  }
});
```

### Option 2: Run daily and let the job decide if reset is needed

Add to `backend/src/index.ts`:

```typescript
import cron from 'node-cron';
import { runMonthlyBillingReset } from './subscriptions/index.js';
import logger from './utils/logger.js';

// Run daily at 00:01
cron.schedule('1 0 * * *', async () => {
  logger.info('Cron: checking if monthly billing reset is needed');
  try {
    const result = await runMonthlyBillingReset();
    if (result.resetPerformed) {
      logger.info(result, 'Monthly billing reset completed');
    } else {
      logger.debug('Monthly billing reset not needed');
    }
  } catch (error) {
    logger.error({ error }, 'Monthly billing reset failed');
  }
});
```

### Option 3: Manual trigger via API endpoint

Create an admin endpoint to manually trigger the reset:

```typescript
import { Router } from 'express';
import { runMonthlyBillingReset } from './subscriptions/index.js';

const router = Router();

router.post('/admin/billing/reset-monthly', async (req, res) => {
  try {
    // Add authentication/authorization here
    const result = await runMonthlyBillingReset();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset monthly billing' });
  }
});

export default router;
```

## Cron Schedule Syntax

The cron schedule format is: `minute hour day month day-of-week`

Examples:
- `1 0 1 * *` - At 00:01 on the 1st day of every month
- `1 0 * * *` - At 00:01 every day
- `0 0 1 * *` - At midnight on the 1st day of every month
- `0 2 1 * *` - At 02:00 on the 1st day of every month

## Error Handling

The job includes comprehensive error handling:
- Database errors are logged and thrown
- Failed resets can be retried
- The job is idempotent - running it multiple times in the same month is safe

## Testing

Run the unit tests:

```bash
npm test -- BillingResetJob.test.ts
```

## Requirements Satisfied

- **Requirement 6.4**: Monthly token count reset at billing period boundaries
- **Requirement 11.7**: Billing period date updates in subscription database

## Notes

- The job updates ALL users in a single transaction
- The billing month format is always YYYY-MM (e.g., "2024-03")
- The job is safe to run multiple times - it will update all users to the current month
- Consider running the job during low-traffic hours (e.g., midnight)
- Monitor the job execution time as the user base grows
