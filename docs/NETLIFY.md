# Netlify Deployment

This application can run on Netlify as a standard Next.js deployment.

Netlify currently supports Next.js App Router, SSR, middleware, route handlers, and image optimization with zero-config Next.js support. Prisma also documents Netlify as a supported serverless deployment target.

## Recommended deployment shape

- Hosting: Netlify
- Database: Prisma Postgres via the Netlify extension, or a pooled PostgreSQL provider such as Supabase/Neon
- Email during staging: `EMAIL_PROVIDER=noop`
- Digest automation: manual initially, then move to a Netlify Background Function if required

## Build settings

This repo is not a monorepo. Use the repository root.

- Base directory: leave blank
- Build command: `npm run build`
- Publish directory: `.next`
- Node version: `20`

The repo-level [netlify.toml](/Users/abhichandel/Documents/Faculty feedback application/netlify.toml) already sets these values.
The repository `build` script itself runs `prisma generate` before `next build`, so a stale generated client does not depend on Netlify UI settings.

## Environment variables

Set these in Netlify for both Production and Preview unless noted otherwise.

### Required

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `APP_BASE_URL`

`DIRECT_URL` is not required for Netlify site builds. The repo falls back to `DATABASE_URL` for Prisma client generation during CI.

### Recommended staging defaults

- `EMAIL_PROVIDER=noop`
- `TURNSTILE_SITE_KEY=1x00000000000000000000AA`
- `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`
- `CRON_SECRET=<generate a random secret>`
- `DIGEST_TIMEZONE=America/New_York`
- `DIGEST_MIN_THRESHOLD=4`
- `DIGEST_MAX_AGE_DAYS=180`

### Optional email providers

If you want real email instead of `noop`, use one of:

- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY=...`
- `RESEND_FROM_EMAIL=Faculty Feedback <noreply@your-domain.example>`

or

- `EMAIL_PROVIDER=postmark`
- `POSTMARK_API_TOKEN=...`
- `POSTMARK_SENDER_EMAIL=noreply@your-domain.example`

or

- `EMAIL_PROVIDER=sendgrid`
- `SENDGRID_API_KEY=...`
- `POSTMARK_SENDER_EMAIL=noreply@your-domain.example`

## Database options

### Option 1: Prisma Postgres via Netlify

This is the simplest Netlify-native option.

Prisma provides a Netlify extension that provisions Prisma Postgres and automatically sets `DATABASE_URL` for the site.

If you choose this path:

1. Install the Prisma Postgres Netlify extension.
2. Attach a Production and Preview database.
3. Confirm `DATABASE_URL` is present in Netlify environment variables.

### Option 2: Existing PostgreSQL provider

If you keep Supabase, Neon, or another PostgreSQL provider, use a pooled connection string in `DATABASE_URL`.

For serverless deployments, prefer the provider's pooled connection URL over a direct raw database host.

## Initial database setup

Netlify will build and run the app, but it will not automatically run Prisma migrations for you.

You need a one-time schema initialization path before first login:

1. `npx prisma migrate deploy`
2. `npm run prisma:seed`
3. `npm run admin:create -- 'you@example.org' 'StrongPassword123!'`

If your local machine cannot reach the database reliably, do not keep forcing local Prisma commands. Use one of these instead:

1. Run the Prisma commands from a CI job that has database access.
2. Use a temporary remote job runner.
3. Switch to Prisma Postgres via the Netlify extension and use that as the clean deployment reset.

## Netlify UI setup

1. Create a new site from Git.
2. Connect the GitHub repo.
3. Use the repo root as the deploy target.
4. Confirm:
   - Base directory: blank
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Add the required environment variables.
6. Deploy.

## Post-deploy checks

After the first successful deploy:

1. Open `/admin/login`
2. Open `/search`
3. Verify student submission works
4. Verify admin login works
5. Verify QR downloads and packet PDF generation

## Digest automation caveat

The current digest engine is exposed through an internal HTTP route that expects a `POST` with `x-cron-secret`.

Netlify Scheduled Functions:

- run on published deploys only
- do not support request payloads or `POST` payload data
- have a 30 second execution limit

For this app, the safe Netlify path is:

1. keep digests manual at first, or
2. move digest execution into a Netlify Background Function and optionally trigger it from a Scheduled Function

That should be done as a separate change, not folded into the initial platform switch.

## Notes specific to this codebase

- The app already builds as a standard Node/Next.js deployment.
- The Cloudflare-specific code path is runtime-gated and will not activate on Netlify.
- The Cloud Run files can stay in the repo; they do not interfere with Netlify.

## Sources

- Netlify Next.js framework support: https://docs.netlify.com/build/frameworks/overview/
- Netlify Next.js config values: https://docs.netlify.com/snippets/frameworks/nextjs-config-values/
- Netlify Scheduled Functions: https://docs.netlify.com/functions/scheduled-functions/
- Netlify Background Functions: https://docs.netlify.com/build/functions/background-functions/
- Prisma deploy to Netlify: https://www.prisma.io/docs/v6/orm/prisma-client/deployment/serverless/deploy-to-netlify
- Prisma Postgres Netlify extension: https://www.prisma.io/docs/guides/postgres/netlify
