# Deployment Guide

## 1. Provision infrastructure
- Frontend/server runtime: Vercel (recommended) or containerized Node runtime.
- Database: managed PostgreSQL with PITR backups enabled.
- Optional cache/rate-limit store: Upstash Redis.
- Email provider: Postmark or SendGrid.

## 2. Configure environment variables
Use `.env.example` as baseline:
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `APP_BASE_URL`
- `EMAIL_PROVIDER`
- `POSTMARK_API_TOKEN` + `POSTMARK_SENDER_EMAIL` OR `SENDGRID_API_KEY`
- `TURNSTILE_SECRET_KEY` and `TURNSTILE_SITE_KEY`
- `CRON_SECRET`
- `DIGEST_TIMEZONE`, `DIGEST_MIN_THRESHOLD`, `DIGEST_MAX_AGE_DAYS`

## 3. Initialize database
Run in deployment pipeline:
1. `prisma migrate deploy`
2. `prisma generate`
3. `prisma db seed`

## 4. Scheduler
Configure hourly HTTP POST job to:
`/api/internal/jobs/digest`

Required header:
`x-cron-secret: <CRON_SECRET>`

## 5. Staging setup
- Separate staging DB and staging email stream.
- Enable seed data in staging.
- Run smoke tests and E2E against staging URL.
- Use digest preview in staging before production release.

## 6. Production hardening checklist
- Enforce HTTPS and HSTS.
- Restrict admin routes to authenticated users.
- Enforce MFA for all admin users.
- Set up monitoring for 5xx responses and failed digest sends.
- Configure DB backup retention and periodic restore test.
