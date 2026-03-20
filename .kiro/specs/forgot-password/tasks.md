# Tasks

## Task List

- [x] 1. Database migration — add `password_reset_tokens` table
  - [x] 1.1 Add `passwordResetTokens` table definition to `backend/src/db/schema.ts` with columns: `id`, `userId`, `tokenHash`, `expiresAt`, `used`, `createdAt`, and appropriate indexes
  - [x] 1.2 Create migration file `backend/drizzle/0010_forgot_password.sql` with the corresponding SQL DDL
  - [x] 1.3 Export the new table and its types from `backend/src/db/client.ts`

- [x] 2. Backend — password reset service
  - [x] 2.1 Create `backend/src/services/passwordResetService.ts` with `requestPasswordReset(email)`, `validateResetToken(rawToken)`, and `resetPassword(rawToken, newPassword)` functions
  - [x] 2.2 Implement token generation using `crypto.randomBytes(32).toString('hex')` and store SHA-256 hash in DB
  - [x] 2.3 Implement invalidation of previous pending tokens for the same user before inserting a new one
  - [x] 2.4 Implement constant-time response for `requestPasswordReset` regardless of whether the email exists (use a fixed artificial delay or equivalent)

- [x] 3. Backend — email template and mail service
  - [x] 3.1 Add `passwordResetTemplate(resetUrl: string)` to `backend/src/services/emailTemplates.ts` with subject "Recuperación de contraseña - Atriax", reset link, and 1-hour expiry notice
  - [x] 3.2 Add `sendPasswordResetEmail(email: string, resetUrl: string)` to `backend/src/services/mailService.ts`

- [x] 4. Backend — API routes
  - [x] 4.1 Add `POST /api/auth/forgot-password` route to `backend/src/routes/auth.ts` with email validation via zod and rate limiting (5 req / 15 min per IP using `express-rate-limit`)
  - [x] 4.2 Add `GET /api/auth/reset-password/validate` route that validates the token and returns 200 or 400
  - [x] 4.3 Add `POST /api/auth/reset-password` route with zod validation (token + password min 8 chars) that calls `resetPassword`

- [x] 5. Frontend — ForgotPasswordPage
  - [x] 5.1 Create `frontend/src/pages/ForgotPasswordPage.tsx` with email field, submit button ("Enviar enlace de recuperación"), and back link ("Volver al inicio de sesión")
  - [x] 5.2 Implement client-side email format validation before making any API call
  - [x] 5.3 Disable submit button while request is in flight
  - [x] 5.4 Show confirmation message "Si el email está registrado, recibirás un enlace en breve." after API response (success or not-found)

- [x] 6. Frontend — ResetPasswordPage
  - [x] 6.1 Create `frontend/src/pages/ResetPasswordPage.tsx` with "Nueva contraseña" and "Confirmar contraseña" fields
  - [x] 6.2 On mount, read token from URL query param; redirect to `/forgot-password` if absent
  - [x] 6.3 On mount (when token present), call `GET /api/auth/reset-password/validate`; show error message with link to request new token if invalid
  - [x] 6.4 Implement client-side validation: password >= 8 chars and both fields must match ("Las contraseñas no coinciden")
  - [x] 6.5 Disable submit button while request is in flight
  - [x] 6.6 On success, show "Contraseña actualizada correctamente" and redirect to `/login` after 3 seconds

- [x] 7. Frontend — wire up routes and login page link
  - [x] 7.1 Add `<Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>` to `LoginPage.tsx` below the password field
  - [x] 7.2 Add `/forgot-password` and `/reset-password` routes to `App.tsx` wrapped in `<PublicRoute>`

- [x] 8. Tests — property-based tests (backend)
  - [x] 8.1 Create `backend/src/services/__tests__/passwordResetService.property.test.ts` with property tests for Properties 1, 3, 5, 6, 7, 8, 9
  - [x] 8.2 Add property test for Property 12 to email templates test file (or create `backend/src/services/__tests__/emailTemplates.property.test.ts`)
  - [x] 8.3 Create `backend/src/routes/__tests__/auth.ratelimit.test.ts` with property test for Property 14

- [ ] 9. Tests — property-based tests (frontend)
  - [ ] 9.1 Create `frontend/src/pages/__tests__/ForgotPasswordPage.property.test.tsx` with property tests for Properties 4
  - [ ] 9.2 Create `frontend/src/pages/__tests__/ResetPasswordPage.property.test.tsx` with property tests for Properties 10, 11

- [ ] 10. Tests — unit/example tests
  - [ ] 10.1 Add unit tests for `LoginPage` asserting the forgot-password link is rendered
  - [ ] 10.2 Add unit tests for `ForgotPasswordPage` covering: renders required elements, shows confirmation after submit, disables button during loading
  - [ ] 10.3 Add unit tests for `ResetPasswordPage` covering: redirects when no token, shows error for invalid token, shows success and redirects after reset, disables button during loading
  - [ ] 10.4 Add unit tests for `POST /api/auth/forgot-password` covering: returns 200 for registered email, returns 200 for unregistered email (same message), returns 400 for invalid email format
  - [ ] 10.5 Add unit tests for `POST /api/auth/reset-password` covering: returns 200 for valid token + password, returns 400 for expired token, returns 400 for used token
