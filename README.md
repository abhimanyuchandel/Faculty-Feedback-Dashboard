# Faculty Feedback Application

Production-focused Next.js web application for collecting anonymous student feedback about Department of Medicine faculty.

## Implemented modules
- Anonymous public submission flow (`/search`, `/f/[publicToken]`, `/thanks`)
- Faculty management, CSV import/export, QR downloads
- Survey versioning and question builder
- Feedback review dashboard
- Teaching session management and QR packet PDF generation
- Digest automation with unsubscribe/resubscribe email tokens
- Admin authentication with NextAuth credentials scaffold
- Audit logging and diagnostics page

## Project structure
- `src/app`: pages and API routes
- `src/services`: domain logic
- `src/lib`: shared infrastructure and security helpers
- `prisma`: schema, migration skeleton, seed script
- `tests`: unit, integration, E2E test scaffolding
- `docs`: architecture and deployment documentation

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

## Notes
- The submission flow intentionally stores no student-identifying fields.
- Faculty are identified by primary email and public token.
- Published survey versions are treated as immutable for historical integrity.
