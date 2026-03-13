# Deployment Guide

## 1. Runtime model
- Local Next.js development uses `.env` and `npm run dev`.
- Cloudflare preview and deploy use OpenNext, `wrangler.jsonc`, and `.dev.vars`.
- The deployed worker should use a pooled PostgreSQL connection string.
- Local Prisma migrations and seed scripts should keep using a direct or session PostgreSQL connection string.

## 2. Required services
- Cloudflare Workers account
- Managed PostgreSQL database
- Optional email provider: `noop`, Postmark, SendGrid, or Resend
- Optional Turnstile site and secret keys for production CAPTCHA

## 3. Local setup
1. Copy `.env.example` to `.env` and fill local values.
2. Copy `.dev.vars.example` to `.dev.vars`.
3. In `.env`, use your direct or session database URL for local Prisma commands.
4. In `.dev.vars`, use your pooled worker-safe database URL.
5. Run local app:
   - `npm run dev`
6. Run Cloudflare preview:
   - `npm run cf:preview`

## 4. Worker configuration
- `wrangler.jsonc` defines:
  - production worker: `faculty-feedback-dashboard`
  - staging worker: `faculty-feedback-dashboard-staging`
  - OpenNext asset binding
  - self-service binding for internal revalidation
  - safe default digest variables
- If either worker name is already taken in your Cloudflare account, rename both the `name` and matching `service` values before deploying.

## 5. Cloudflare variables and secrets
Set these in Cloudflare Workers -> your worker -> Settings -> Variables and Secrets.

Secrets:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `CRON_SECRET`
- `POSTMARK_API_TOKEN` if using Postmark
- `SENDGRID_API_KEY` if using SendGrid
- `RESEND_API_KEY` if using Resend
- `TURNSTILE_SECRET_KEY` for production CAPTCHA

Plain variables:
- `NEXTAUTH_URL`
- `APP_BASE_URL`
- `EMAIL_PROVIDER`
- `POSTMARK_SENDER_EMAIL` if using Postmark
- `RESEND_FROM_EMAIL` if using Resend
- `TURNSTILE_SITE_KEY`
- `DIGEST_TIMEZONE`
- `DIGEST_MIN_THRESHOLD`
- `DIGEST_MAX_AGE_DAYS`

Recommended staging defaults:
- `EMAIL_PROVIDER=noop`
- `TURNSTILE_SITE_KEY=1x00000000000000000000AA`
- `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`

## 6. Database initialization
Run locally against the direct or session database URL:
1. `npx prisma migrate deploy`
2. `npm run prisma:seed`
3. `npm run admin:create -- 'your-admin-email@yourorg.edu' 'YourStrongPassword123!'`

## 7. Deploy commands
1. Authenticate Wrangler:
   - `npx wrangler login`
2. Preview locally:
   - `npm run cf:preview`
3. Deploy staging worker:
   - `npm run cf:deploy -- --env staging`
4. Deploy production worker:
   - `npm run cf:deploy`

## 8. Digest scheduling
The application still expects an HTTP `POST` to `/api/internal/jobs/digest` with header:
- `x-cron-secret: <CRON_SECRET>`

For now, use one of:
- manual admin-triggered digest runs
- an external scheduler that can send authenticated `POST` requests

## 9. Smoke test checklist
1. `/admin/login`
2. admin dashboard navigation
3. faculty search
4. student feedback submission
5. QR PNG download
6. QR packet PDF download
7. digest preview
8. forgot-password flow

## 10. Production hardening checklist
- move from `EMAIL_PROVIDER=noop` to a real provider
- use production Turnstile keys
- use separate staging and production databases
- enforce MFA for all admin users
- monitor worker errors and failed digest runs
- validate backup restore on the database provider
