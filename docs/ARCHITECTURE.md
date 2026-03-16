# Faculty Feedback Application Architecture

## Core goals
- Preserve student anonymity end-to-end.
- Provide secure admin operations for faculty/survey/session management.
- Provide only aggregated digest feedback to faculty.
- Keep design maintainable for long-term departmental use.

## Application layers
- `src/app`: Next.js app routes and API route handlers.
- `src/services`: domain services for faculty/survey/feedback/digest/QR/session logic.
- `src/lib`: shared adapters and utilities (auth, db, audit, validation, privacy).
- `prisma`: data schema and seed scripts.

## Security and privacy model
- No student auth and no student PII fields in schema.
- Public submit endpoint uses Cloudflare Turnstile CAPTCHA and request throttling.
- Faculty links use opaque public tokens (`/f/[publicToken]`).
- Faculty digest email shows only aggregated data grouped by curriculum phase.
- Unsubscribe/resubscribe uses one-time hashed email tokens.
- Admin sign-in supports TOTP-based MFA.
- Admin actions are logged in `audit_logs`.

## Digest rule implementation
Automated digest eligibility is based on schedule, not thresholds:
1. The first digest becomes eligible 6 months after faculty creation.
2. Each faculty gets a stable random offset between 1 and 60 days to spread sends out.
3. After the first cycle, eligibility repeats every 6 months.
4. A digest is skipped if there was no feedback in that faculty member's prior 6-month window.

## Scaling notes
- 1000+ faculty is low-risk with indexed Postgres queries.
- Fuzzy search uses Postgres trigram indexes.
- Digest cycle is asynchronous via scheduled job endpoint (`/api/internal/jobs/digest`).
