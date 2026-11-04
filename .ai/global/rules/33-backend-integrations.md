# Backend - External Integrations

## Google Calendar

- OAuth2 flow for calendar authorization.
- Store encrypted tokens in database using `GOOGLE_TOKEN_ENCRYPTION_KEY`.
- Use queue-based sync worker (`calendarSyncWorker.ts`) for async operations.
- Implement retry logic with exponential backoff for API failures.
- Handle token refresh automatically.

## AWS S3

- Use presigned URLs for secure file uploads/downloads.
- Store only file keys in database, not full URLs.
- Implement cleanup jobs for orphaned files.
- Set appropriate expiration times for presigned URLs.

## Mercado Pago

- All subscription logic in `src/subscriptions/`.
- Use `LimitEnforcer` to enforce per-plan appointment limits.
- Handle webhook events for subscription status changes.
- Store amounts in cents (ARS currency).

## Email (SMTP / Amazon SES)

- Use `mailService.ts` for all email operations.
- Template emails for consistency.
- Handle email failures gracefully (log but don't block operations).
- Include unsubscribe links where required.
