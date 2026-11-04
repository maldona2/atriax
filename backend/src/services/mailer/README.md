# Mailer (SMTP / Amazon SES)

Copied from the shared mailer module (`mailer-module/backend/src/services/mailer/`).
Only the transport and its config are here; `mailService.ts` keeps building the
Atriax HTML and plain-text bodies with `emailTemplates.ts`.

## What was copied

- `config.ts`: `loadMailConfig` (SMTP vs log mode, env validation).
- `mailer.ts`: `createMailer` (nodemailer transport, 3 attempts with backoff
  on 4xx and network errors, masked logs).
- Their tests.

## What changed from the original

- Not copied: `templates.ts`, `index.ts` and `loadMailBrand`. The project has
  its own templates, and `loadMailBrand` needs zod 4 (the backend is on zod 3).
- `mailer.ts` also logs the SMTP response text on failure (`response`), with
  every email address in it masked (`j***@example.com`). SES puts the
  recipient in some rejections, e.g. "Email address is not verified".
- Logger: the backend's pino logger (`src/utils/logger.ts`), same as the
  original module expects. No adapter needed.
- The module's `index.ts` loads config at import and requires `MAIL_FROM`.
  `mailService.ts` instead treats "no mail env at all" as unconfigured: sends
  reject with `Mail not configured` and the backend keeps running. Any mail
  env present goes through `loadMailConfig`, so a partial config still fails
  at startup.

## Env

| Variable                  | Notes                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `MAIL_FROM`               | Sender, e.g. `Atriax <no-reply@mail.example.com>`. Must be a verified SES identity. |
| `SMTP_HOST`               | `email-smtp.<region>.amazonaws.com` (same region as the identity).                  |
| `SMTP_PORT`               | Default `587` (STARTTLS). `465` uses implicit TLS.                                  |
| `SMTP_USER` / `SMTP_PASS` | SES SMTP credentials (not IAM access keys). Never logged.                           |

Modes:

- No variable set: unconfigured, sends fail, app runs.
- `MAIL_FROM` only, `NODE_ENV` not `production`: log mode (`jsonTransport`),
  nothing leaves the machine. Tests run this way.
- In production, `MAIL_FROM` plus all three `SMTP_*` are required once any is set.

## Logs

- Success: `mail sent` with `messageId`, masked `to`, `subject`, `attempt`, `mode`.
- Retry: `mail send failed, retrying` (warn).
- Failure: `mail send failed` (error) with `code`, `responseCode`, `response`.
