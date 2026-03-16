# Cloud Run Deployment

## Goal
- Run the Next.js application on Google Cloud Run using a standard Node container.
- Keep the database outside your laptop so local DNS and Postgres connectivity issues stop blocking testing.

## Recommended first deployment
- Runtime: Cloud Run service
- Database: keep your existing Supabase PostgreSQL for now
- Email: `noop` for initial staging validation
- DB initialization: Cloud Run jobs using the same container image

This is the fastest path because it avoids local Prisma connectivity entirely.

## 1. Prerequisites
- Google Cloud project
- Billing enabled
- `gcloud` CLI installed and authenticated
- Cloud Run Admin API enabled
- Cloud Build API enabled
- Artifact Registry API enabled

Official docs:
- [Deploy from source to Cloud Run](https://cloud.google.com/run/docs/deploying-source-code)
- [Container runtime contract](https://cloud.google.com/run/docs/container-contract)
- [Cloud Run jobs execution](https://cloud.google.com/run/docs/execute/jobs)
- [Cloud Run service environment variables](https://docs.cloud.google.com/run/docs/configuring/services/overview-environment-variables)
- [Cloud Run secrets](https://cloud.google.com/run/docs/configuring/services/secrets)

## 2. Choose environment values

Use your Supabase URLs like this:

- Cloud Run service `DATABASE_URL`
  - transaction pooler `6543`
  - append `?pgbouncer=true&connection_limit=1&sslmode=require&connect_timeout=30`

- Cloud Run jobs `DATABASE_URL`
  - session pooler `5432`
  - append `?sslmode=require&connect_timeout=30`

- Cloud Run jobs `DIRECT_URL`
  - same session pooler `5432` URL

Other required runtime values:
- `NEXTAUTH_URL=https://YOUR_CLOUD_RUN_URL`
- `APP_BASE_URL=https://YOUR_CLOUD_RUN_URL`
- `NEXTAUTH_SECRET=...`
- `CRON_SECRET=...`
- `EMAIL_PROVIDER=noop`
- `DIGEST_TIMEZONE=America/New_York`
- `TURNSTILE_SITE_KEY=...`
- `TURNSTILE_SECRET_KEY=...`
- `MFA_ENCRYPTION_KEY=...`

## 3. Deploy the web service

From the repo root:

```bash
cd "/Users/abhichandel/Documents/Faculty feedback application"
gcloud run deploy faculty-feedback \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars EMAIL_PROVIDER=noop,DIGEST_TIMEZONE=America/New_York,TURNSTILE_SITE_KEY=REPLACE_WITH_SITE_KEY \
  --set-env-vars NEXTAUTH_URL=https://REPLACE_WITH_SERVICE_URL,APP_BASE_URL=https://REPLACE_WITH_SERVICE_URL \
  --set-env-vars DATABASE_URL='REPLACE_WITH_6543_TRANSACTION_POOLER_URL' \
  --set-secrets NEXTAUTH_SECRET=nextauth-secret:latest,CRON_SECRET=cron-secret:latest,TURNSTILE_SECRET_KEY=turnstile-secret:latest,MFA_ENCRYPTION_KEY=mfa-encryption-key:latest
```

Notes:
- If you are not using Secret Manager yet, you can temporarily replace `--set-secrets` with `--set-env-vars`, but keep in mind Google recommends Secret Manager for secrets.
- Cloud Run uses the Dockerfile in this repository automatically.

## 4. Update the service URL values

After the first deploy, Cloud Run prints the service URL.

Redeploy the service with that exact URL in:
- `NEXTAUTH_URL`
- `APP_BASE_URL`

Example:

```bash
gcloud run services update faculty-feedback \
  --region us-east1 \
  --update-env-vars NEXTAUTH_URL=https://faculty-feedback-xxxxx-ue.a.run.app,APP_BASE_URL=https://faculty-feedback-xxxxx-ue.a.run.app
```

## 5. Create a migration job

Create a Cloud Run job from the same image/source:

```bash
gcloud run jobs create faculty-feedback-migrate \
  --source . \
  --region us-east1 \
  --set-env-vars DATABASE_URL='REPLACE_WITH_5432_SESSION_POOLER_URL',DIRECT_URL='REPLACE_WITH_5432_SESSION_POOLER_URL' \
  --command sh \
  --args -lc,'npx prisma migrate deploy'
```

Execute it:

```bash
gcloud run jobs execute faculty-feedback-migrate --region us-east1
```

## 6. Create a seed job

```bash
gcloud run jobs create faculty-feedback-seed \
  --source . \
  --region us-east1 \
  --set-env-vars DATABASE_URL='REPLACE_WITH_5432_SESSION_POOLER_URL',DIRECT_URL='REPLACE_WITH_5432_SESSION_POOLER_URL' \
  --command sh \
  --args -lc,'npm run prisma:seed'
```

Execute it:

```bash
gcloud run jobs execute faculty-feedback-seed --region us-east1
```

## 7. Create the first admin user

The `admin:create` script accepts `ADMIN_EMAIL` and `ADMIN_PASSWORD` now, so you do not need to put credentials in the command line.

Create the job:

```bash
gcloud run jobs create faculty-feedback-admin-create \
  --source . \
  --region us-east1 \
  --set-env-vars DATABASE_URL='REPLACE_WITH_5432_SESSION_POOLER_URL',DIRECT_URL='REPLACE_WITH_5432_SESSION_POOLER_URL',ADMIN_EMAIL='abhimanyu.chandel4@gmail.com' \
  --set-secrets ADMIN_PASSWORD=admin-password:latest \
  --command sh \
  --args -lc,'npm run admin:create'
```

Execute it:

```bash
gcloud run jobs execute faculty-feedback-admin-create --region us-east1
```

## 8. Smoke test

Open:
- `/admin/login`
- `/search`
- a known faculty page `/f/<public-token>`

Validate:
- admin login works
- faculty search works
- student submission works
- QR PNG downloads
- session QR packet PDF downloads

## 9. Digest execution

The app still exposes:
- `GET|POST /api/internal/jobs/digest`

Required auth:
- `Authorization: Bearer <CRON_SECRET>` or
- `x-cron-secret: <CRON_SECRET>`

You can trigger that from:
- Cloud Scheduler
- another Cloud Run job calling the endpoint

## 10. What to use later

Once staging is stable:
- move secrets fully into Secret Manager
- consider moving from Supabase to Cloud SQL if you want Google-managed app + database together
- add Cloud Scheduler for digest automation
