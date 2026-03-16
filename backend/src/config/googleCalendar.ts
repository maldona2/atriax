export const googleCalendarConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID ?? '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  redirectUri:
    process.env.GOOGLE_REDIRECT_URI ??
    'http://localhost:5001/api/auth/google/calendar/callback',
  scopes: ['https://www.googleapis.com/auth/calendar.events'],

  encryption: {
    algorithm: 'aes-256-gcm' as const,
    keyEnv: 'GOOGLE_TOKEN_ENCRYPTION_KEY',
  },

  sync: {
    maxRetries: Number(process.env.GOOGLE_SYNC_MAX_RETRIES ?? 5),
    initialBackoffMs: Number(
      process.env.GOOGLE_SYNC_INITIAL_BACKOFF_MS ?? 1000
    ),
    batchSize: Number(process.env.GOOGLE_SYNC_BATCH_SIZE ?? 10),
    workerIntervalMs: Number(
      process.env.GOOGLE_SYNC_WORKER_INTERVAL_MS ?? 5000
    ),
  },

  rateLimit: {
    requestsPerSecond: Number(process.env.GOOGLE_RATE_LIMIT_RPS ?? 10),
    requestsPerMinute: Number(process.env.GOOGLE_RATE_LIMIT_RPM ?? 600),
  },

  monitoring: {
    alertFailureRateThreshold: Number(
      process.env.GOOGLE_SYNC_ALERT_THRESHOLD ?? 0.05
    ),
  },

  appBaseUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
};

export type GoogleCalendarConfig = typeof googleCalendarConfig;
