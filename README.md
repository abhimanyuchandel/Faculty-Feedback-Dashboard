# Faculty Feedback Application

Next.js application for collecting anonymous student feedback about USUHS Department of Medicine faculty, reviewing submissions through an admin dashboard, and sending scheduled faculty digest emails.

## Current production shape

- App hosting: Vercel
- Database: PostgreSQL via Supabase
- Email delivery: Resend
- Bot protection: Cloudflare Turnstile
- Admin auth: NextAuth credentials with optional TOTP MFA

The repository still includes Cloudflare/OpenNext, Netlify, and Cloud Run support files for alternate deployments, but the primary production path is Vercel.

## Core capabilities

- Public faculty search and anonymous student feedback submission
- Faculty QR code generation and printable session packets
- Survey versioning and curriculum-phase targeting
- Teaching session management
- Enrollment request workflow for faculty not yet in the directory
- Scheduled faculty digest emails every six months, with unsubscribe/resubscribe links
- Admin account management, password reset, audit logging, and diagnostics

## Privacy and security highlights

- No student login is required.
- The schema does not store dedicated student identity fields.
- Public feedback submissions are protected with Turnstile and request throttling.
- Faculty feedback links use opaque public tokens.
- Admin passwords are bcrypt-hashed.
- MFA secrets are encrypted before storage.
- Audit logs capture admin and system actions.

Important current behavior:

- Public faculty search is an exact-match lookup by full last name, primary email, or secondary email.
- Faculty digests are anonymized, but they currently include response-level content rather than only high-level aggregates.
- Free-text redaction currently removes email addresses and phone numbers, not all possible identifiers.

## Local setup

Prerequisites:

- Node.js 20+
- npm 10+
- PostgreSQL 15+

Commands:

1. `cp .env.example .env`
2. `npm install`
3. `npx prisma generate`
4. `npx prisma migrate dev`
5. `npm run prisma:seed`
6. `npm run dev`

## Test commands

- `npm run test`
- `npm run test:e2e`
- `npm run lint`
- `npm run typecheck`

## Documentation

- [Architecture](/Users/abhichandel/Documents/Faculty feedback application/docs/ARCHITECTURE.md)
- [Deployment](/Users/abhichandel/Documents/Faculty feedback application/docs/DEPLOYMENT.md)
- [API Summary](/Users/abhichandel/Documents/Faculty feedback application/docs/API.md)
- [Netlify reference](/Users/abhichandel/Documents/Faculty feedback application/docs/NETLIFY.md)
- [Cloud Run reference](/Users/abhichandel/Documents/Faculty feedback application/docs/CLOUD_RUN.md)
