# Deployment Guide

## Primary production model

The current primary deployment path for this repository is:

- App hosting: Vercel
- Database: Supabase PostgreSQL
- Email: Resend
- CAPTCHA: Cloudflare Turnstile
- Scheduled digests: Vercel cron

The repository still includes Cloudflare/OpenNext support plus reference guides for Netlify and Cloud Run, but those are alternate paths rather than the recommended production default.

## Required services

- Vercel project connected to the repository
- Supabase project with pooled and direct/session Postgres connection strings
- Resend account with a verified sending domain or subdomain
- Cloudflare Turnstile widget for production CAPTCHA

Recommended sending shape for production:

- verified subdomain such as `updates.facultyteachingfeedback.com`
- sender such as `Faculty Feedback <feedback@updates.facultyteachingfeedback.com>`

## Environment variables

Set these in `Vercel -> Project -> Settings -> Environment Variables`.

### Required secrets

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `CRON_SECRET`
- `RESEND_API_KEY` if `EMAIL_PROVIDER=resend`
- `TURNSTILE_SECRET_KEY`
- `MFA_ENCRYPTION_KEY`

### Required plain variables

- `NEXTAUTH_URL`
- `APP_BASE_URL`
- `EMAIL_PROVIDER`
- `RESEND_FROM_EMAIL` if `EMAIL_PROVIDER=resend`
- `TURNSTILE_SITE_KEY`
- `DIGEST_TIMEZONE`

### Current recommended production values

- `EMAIL_PROVIDER=resend`
- `APP_BASE_URL=https://facultyteachingfeedback.com`
- `NEXTAUTH_URL=https://facultyteachingfeedback.com`
- `DIGEST_TIMEZONE=America/New_York`
- `RESEND_FROM_EMAIL=Faculty Feedback <feedback@updates.facultyteachingfeedback.com>`

### Preview/staging-friendly defaults

- `EMAIL_PROVIDER=noop`
- `TURNSTILE_SITE_KEY=1x00000000000000000000AA`
- `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`

## Database connection guidance

- Use the Supabase transaction pooler URL for `DATABASE_URL` in the Vercel runtime.
- Use a direct or session connection string for local Prisma CLI commands in `DIRECT_URL`.
- After password rotation, replace the full connection string in Vercel rather than editing just the password segment by hand.

## Initial database setup

Run these from a machine that has database access using the direct/session URL:

1. `npx prisma migrate deploy`
2. `npm run prisma:seed`
3. `npm run admin:create -- 'your-admin-email@yourorg.edu' 'YourStrongPassword123!'`

## Deploy flow

1. Push to `main`.
2. Let Vercel build and deploy automatically, or redeploy manually from the Vercel dashboard after environment changes.
3. Any environment-variable change requires a new deployment before it takes effect.

## Digest scheduling

Vercel cron runs:

- `GET /api/internal/jobs/digest`
- schedule: `0 14 * * *`

Digest behavior:

- first automated digest becomes eligible 6 months after faculty creation
- each faculty gets a stable 1-60 day offset
- the cycle repeats every 6 months
- no digest is sent unless feedback exists in the prior 6-month window

The route accepts either:

- `Authorization: Bearer <CRON_SECRET>`
- `x-cron-secret: <CRON_SECRET>`

## Smoke test checklist

1. `/search`
2. exact-match public faculty search by full last name and full email
3. student feedback submission with Turnstile challenge
4. faculty enrollment invite email
5. faculty enrollment request flow
6. `/admin/login`
7. admin dashboard navigation
8. `/admin/account` profile update and MFA setup
9. digest preview and test digest
10. QR PNG download and packet PDF download
11. forgot-password flow

## Production hardening checklist

- verify the Resend sending domain or subdomain
- add SPF, DKIM, and DMARC records for the sending domain
- avoid `noreply@...` senders when possible
- use production Turnstile keys
- set `MFA_ENCRYPTION_KEY` before enabling MFA
- enroll every admin user in MFA
- use separate preview and production databases
- validate database backup and restore with the database provider
- review whether public faculty search should expose email addresses before final launch
- confirm every person with an admin account should have full administrator access

## Alternate deployment references

- [Netlify reference](/Users/abhichandel/Documents/Faculty feedback application/docs/NETLIFY.md)
- [Cloud Run reference](/Users/abhichandel/Documents/Faculty feedback application/docs/CLOUD_RUN.md)

Cloudflare/OpenNext configuration files also remain in the repository for an alternate worker deployment path.
