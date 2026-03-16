# Faculty Feedback Application Architecture

## Core goals

- Preserve student anonymity as much as practical during collection and delivery.
- Give administrators a secure interface for managing faculty, surveys, sessions, and reporting.
- Deliver anonymized faculty feedback digests on a predictable schedule.
- Keep the codebase deployable on Vercel today while preserving alternate hosting options.

## High-level runtime

- `src/app`: Next.js App Router pages and route handlers
- `src/services`: business logic for faculty, surveys, feedback, sessions, digests, and enrollment
- `src/lib`: shared infrastructure for auth, database, audit, validation, email, privacy, and security helpers
- `prisma`: data model, migrations, and seed data

## Current production stack

- Web app: Vercel
- Database: Supabase PostgreSQL
- Email provider: Resend
- CAPTCHA: Cloudflare Turnstile
- Scheduled digest job: Vercel cron calling `/api/internal/jobs/digest`

Cloudflare/OpenNext configuration files remain in the repository as an alternate deployment path.

## Data stored by the application

### Faculty directory

Stored fields include:

- first name
- last name
- primary email
- optional secondary email
- department
- active status
- digest subscription status
- public feedback token

Source: [schema.prisma](/Users/abhichandel/Documents/Faculty feedback application/prisma/schema.prisma#L51)

### Feedback submissions

Stored fields include:

- faculty association
- survey version
- curriculum phase
- optional teaching session reference
- session location snapshot
- submitted timestamp
- submission date
- digest linkage
- CAPTCHA score
- per-question answers, including free text

Source: [schema.prisma](/Users/abhichandel/Documents/Faculty feedback application/prisma/schema.prisma#L151)

### Admin/auth data

Stored fields include:

- admin email and optional display name
- bcrypt password hash
- MFA enabled flag
- encrypted MFA secret
- last login timestamp
- password reset token hashes
- administrator role assignment

Source: [schema.prisma](/Users/abhichandel/Documents/Faculty feedback application/prisma/schema.prisma#L266)

### Audit and enrollment workflow data

Stored fields include:

- audit log entries for admin and system actions
- pending faculty enrollment requests with submitter-provided faculty details
- digest history including send windows and provider message IDs

Sources:

- [schema.prisma](/Users/abhichandel/Documents/Faculty feedback application/prisma/schema.prisma#L231)
- [schema.prisma](/Users/abhichandel/Documents/Faculty feedback application/prisma/schema.prisma#L290)
- [schema.prisma](/Users/abhichandel/Documents/Faculty feedback application/prisma/schema.prisma#L335)

## Public surface area

### Student feedback flow

- Students do not authenticate.
- Students search for faculty on `/search`.
- Students submit feedback through tokenized faculty links such as `/f/[publicToken]`.
- Public submission is protected with Turnstile and a simple in-memory rate limit.

Sources:

- [faculty-search.tsx](/Users/abhichandel/Documents/Faculty feedback application/src/components/public/faculty-search.tsx)
- [route.ts](/Users/abhichandel/Documents/Faculty feedback application/src/app/api/public/feedback/route.ts#L12)
- [captcha.ts](/Users/abhichandel/Documents/Faculty feedback application/src/lib/privacy/captcha.ts#L8)
- [rate-limit.ts](/Users/abhichandel/Documents/Faculty feedback application/src/lib/rate-limit.ts#L8)

### Current public search behavior

- Search is exact-match only.
- Supported search keys are full last name, full primary email, or full secondary email.
- The public search API currently returns faculty name, primary email, optional secondary email, and the public token.
- The current UI displays faculty name, primary email, and the tokenized feedback link.

Sources:

- [faculty-service.ts](/Users/abhichandel/Documents/Faculty feedback application/src/services/faculty-service.ts#L84)
- [route.ts](/Users/abhichandel/Documents/Faculty feedback application/src/app/api/public/faculty/search/route.ts#L12)
- [faculty-search.tsx](/Users/abhichandel/Documents/Faculty feedback application/src/components/public/faculty-search.tsx#L90)

## Admin security model

- `/admin` routes are gated by NextAuth middleware and server-side session checks.
- Admin auth uses local credentials, not institutional SSO.
- Sessions use JWTs with an 8-hour max age.
- MFA is TOTP-based and optional per account, but only works when `MFA_ENCRYPTION_KEY` is configured.
- Password reset links are one-time tokens with a 60-minute TTL.

Sources:

- [middleware.ts](/Users/abhichandel/Documents/Faculty feedback application/middleware.ts#L4)
- [auth.ts](/Users/abhichandel/Documents/Faculty feedback application/src/auth.ts#L8)
- [mfa.ts](/Users/abhichandel/Documents/Faculty feedback application/src/lib/mfa.ts#L71)
- [admin-auth-service.ts](/Users/abhichandel/Documents/Faculty feedback application/src/services/admin-auth-service.ts#L9)

## Feedback privacy model

- The schema does not include explicit student identity fields.
- Free-text responses are passed through a simple redaction helper before storage.
- Current redaction covers email addresses and phone numbers only.
- Faculty digest emails omit exact timestamps, but they do include response-level question/answer content.

Sources:

- [redaction.ts](/Users/abhichandel/Documents/Faculty feedback application/src/lib/privacy/redaction.ts#L1)
- [feedback-service.ts](/Users/abhichandel/Documents/Faculty feedback application/src/services/feedback-service.ts#L190)
- [digest-service.ts](/Users/abhichandel/Documents/Faculty feedback application/src/services/digest-service.ts#L336)

## Digest behavior

- First automated digest eligibility begins 6 months after faculty creation.
- Each faculty record gets a stable random offset between 1 and 60 days.
- After the first cycle, digests repeat every 6 months.
- No automated digest is sent unless feedback exists in the prior 6-month window.
- The digest cron is scheduled daily; eligibility logic determines whether a given faculty member is due.

Sources:

- [digest-schedule.ts](/Users/abhichandel/Documents/Faculty feedback application/src/lib/digest-schedule.ts#L4)
- [digest-service.ts](/Users/abhichandel/Documents/Faculty feedback application/src/services/digest-service.ts#L520)
- [vercel.json](/Users/abhichandel/Documents/Faculty feedback application/vercel.json#L1)

## Current policy/compliance considerations

- Public search currently exposes faculty primary email addresses.
- All administrator accounts currently retain the same access to detailed exports and recent-submission views.
- Backups and disaster recovery rely on the database provider rather than app-managed backup logic.

These are design decisions worth confirming with institutional IT/security reviewers before launch.
