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
3. In `.env`, set:
   - `DATABASE_URL` for local app runtime
   - `DIRECT_URL` for Prisma CLI commands
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
- `DIRECT_URL` if you want to run Prisma CLI commands against the same environment from a remote shell
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
Run locally against the direct or session database URL in `DIRECT_URL`:
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

## 11. Optional GitHub Actions deploy
If you want one-click deployment for teammates:

### What this uses to deploy
This uses **GitHub Actions** to run the repository script `npm run cf:deploy`, which calls **OpenNext for Cloudflare** and deploys the worker through **Wrangler** (`opennextjs-cloudflare deploy`).

In practice, deployment is:
1. GitHub-hosted runner starts (`ubuntu-latest`).
2. Node 20 + `npm ci` install dependencies.
3. Action injects Cloudflare credentials from GitHub Secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. Action runs one of:
   - staging: `npm run cf:deploy -- --env staging`
   - production: `npm run cf:deploy`

### Practical deployment steps
1. In Cloudflare, create an API token with Workers deploy permissions.
2. Copy your Cloudflare Account ID from the dashboard.
3. In GitHub repo: **Settings -> Secrets and variables -> Actions**, add:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. In Cloudflare Workers settings for your worker(s), set required app variables/secrets from Section 5 in this file (`DATABASE_URL`, `NEXTAUTH_SECRET`, `CRON_SECRET`, etc.).
5. In GitHub: **Actions -> Deploy to Cloudflare Workers -> Run workflow**.
6. Select `environment`:
   - `staging` to validate with colleagues
   - `production` when ready
7. Open workflow logs and confirm deployment succeeded; copy the resulting `workers.dev` URL.
8. Smoke test routes from Section 9 before sharing broadly.

Workflow file: `.github/workflows/deploy-cloudflare.yml`.

### Example values (what to fill)
In **GitHub -> Settings -> Secrets and variables -> Actions -> New repository secret**:

- `CLOUDFLARE_API_TOKEN`: a Cloudflare API token with at least:
  - Account: `Cloudflare Workers Scripts:Edit`
  - Account: `Workers KV Storage:Edit` (if used by your worker)
  - Zone: not required for workers.dev-only deployments
- `CLOUDFLARE_ACCOUNT_ID`: your account ID from Cloudflare dashboard sidebar.

Example (redacted) values:
- `CLOUDFLARE_API_TOKEN=3f2c9b7e1a4d...`
- `CLOUDFLARE_ACCOUNT_ID=1a2b3c4d5e6f7g8h9i0jklmnopqrstuv`

### Example run
After adding secrets:
1. Go to **Actions -> Deploy to Cloudflare Workers -> Run workflow**.
2. Select `environment = staging`.
3. Click **Run workflow**.
4. In the job logs, copy the deployed URL (typically `https://faculty-feedback-dashboard-staging.<subdomain>.workers.dev`).
