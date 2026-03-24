# Faculty Feedback Application

Next.js application for collecting anonymous student feedback about USUHS Department of Medicine faculty, reviewing submissions through an admin dashboard, and sending scheduled faculty digest emails.

## Current production shape

- App hosting: Vercel
- Database: PostgreSQL via Supabase
- Email delivery: Resend
- Bot protection: Cloudflare Turnstile
- Admin auth: NextAuth credentials with optional TOTP MFA

The primary production path is Vercel. Alternate deployment guidance now lives under `deploy-examples/`, and the remaining Cloudflare/OpenNext root config files are kept only for that optional worker path.

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

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [API Summary](docs/API.md)
- [Reference materials](docs/reference-materials/README.md)
- [Deployment examples](deploy-examples/README.md)

## Repository layout

- `src/`: Next.js pages, route handlers, shared UI components, and application services
- `prisma/`: schema, migrations, and seed script
- `docs/`: architecture, deployment guides, API summary, and non-runtime reference materials
- `deploy-examples/`: alternate deployment guides and non-primary platform config examples
- `tests/`: unit, integration, and end-to-end tests
- root config files: Next.js, Prisma, Vercel, Playwright, Vitest, and the legacy Cloudflare/OpenNext worker config

## Notes on organization

- The production deployment path is Vercel, while alternate deployment guides are intentionally separated under `deploy-examples/`.
- The Cloudflare/OpenNext config remains at the repo root because that toolchain expects root-level filenames.
- Survey PDFs and similar planning artifacts live under `docs/reference-materials/` so the repo root stays focused on app code and config.
