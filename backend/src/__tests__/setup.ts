// Mail runs in log mode in tests (jsonTransport): MAIL_FROM set, no SMTP_*.
process.env.MAIL_FROM =
  process.env.MAIL_FROM || 'Test <noreply@test.domain.com>';
