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
- Public submit endpoint uses CAPTCHA and request throttling.
- Faculty links use opaque public tokens (`/f/[publicToken]`).
- Faculty digest email shows only aggregated data grouped by curriculum phase.
- Unsubscribe/resubscribe uses one-time hashed email tokens.
- Admin actions are logged in `audit_logs`.

## Digest rule implementation
Digest is eligible for a faculty member when:
1. At least 4 unsent submissions exist.
2. OR at least 1 unsent submission exists and the previous digest is older than 180 days.

## Scaling notes
- 1000+ faculty is low-risk with indexed Postgres queries.
- Fuzzy search uses Postgres trigram indexes.
- Digest cycle is asynchronous via scheduled job endpoint (`/api/internal/jobs/digest`).
