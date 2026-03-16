# API Summary

## Public routes

- `GET /api/public/faculty/search?q=...`
  Exact-match faculty lookup by full last name, full primary email, or full secondary email.
- `GET /api/public/faculty/[publicToken]`
  Resolve a faculty token to a public feedback target.
- `GET /api/public/surveys/active`
  Fetch the active survey version and active curriculum phases.
- `POST /api/public/feedback`
  Submit anonymous student feedback.
- `POST /api/public/enroll`
  Submit a faculty enrollment request for admin review.
- `POST /api/public/enroll/invite`
  Send a faculty enrollment invitation email through the configured provider.
- `GET /api/digest/unsubscribe?token=...`
  Unsubscribe a faculty member from digests using a one-time token.
- `GET /api/digest/resubscribe?token=...`
  Re-subscribe a faculty member using a one-time token.

## Admin authentication and account routes

- `GET|POST /api/auth/[...nextauth]`
- `GET|PATCH /api/admin/account`
- `POST /api/admin/account/mfa`
- `POST /api/admin/auth/forgot-password`
- `POST /api/admin/auth/reset-password`
- `GET|POST /api/admin/admin-users`
- `DELETE /api/admin/admin-users/[id]`

These routes require an authenticated admin session except for the forgot/reset-password flows.

## Admin faculty routes

- `GET|POST /api/admin/faculty`
- `PATCH /api/admin/faculty/[id]`
- `POST /api/admin/faculty/[id]/deactivate`
- `POST /api/admin/faculty/[id]/reactivate`
- `POST /api/admin/faculty/import`
- `GET /api/admin/faculty/export`
- `GET /api/admin/faculty/requests`
- `PATCH /api/admin/faculty/requests/[id]`

## Admin survey, session, QR, and analytics routes

- `GET /api/admin/curriculum-phases`
- `GET|POST /api/admin/surveys`
- `DELETE /api/admin/surveys/[id]`
- `POST /api/admin/surveys/[id]/questions`
- `DELETE /api/admin/surveys/questions/[questionId]`
- `POST /api/admin/surveys/[id]/publish`
- `POST /api/admin/surveys/[id]/reorder`
- `GET|POST /api/admin/sessions`
- `PATCH|DELETE /api/admin/sessions/[id]`
- `GET /api/admin/sessions/[id]/packet?format=single|grid`
- `GET /api/admin/qr/faculty/[id]`
- `GET /api/admin/feedback/overview`
- `GET /api/admin/feedback/export`

## Admin digest routes

- `POST /api/admin/digest/run`
- `GET /api/admin/digest/preview/[facultyId]`
- `POST /api/admin/digest/test/[facultyId]`

## Internal routes

- `GET|POST /api/internal/jobs/digest`

Requires either:

- `Authorization: Bearer <CRON_SECRET>`
- `x-cron-secret: <CRON_SECRET>`
