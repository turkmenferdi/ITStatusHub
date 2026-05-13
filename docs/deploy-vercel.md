# Deploy StatusHub On Vercel

This is the fastest way to make StatusHub reachable from another machine and receive 4me/Xurrent webhooks over the public internet.

## Architecture

- App runtime: `Vercel`
- Database: hosted PostgreSQL such as `Neon`, `Supabase`, `Railway`, or `Vercel Postgres`
- Mail: your SMTP provider
- Webhook source: `4me/Xurrent`

## Before You Start

You need:

- the GitHub repository
- a hosted PostgreSQL database
- SMTP credentials
- production secrets for auth and webhooks

## Step 1: Create A Database

Create a PostgreSQL database on one of these providers:

- `Neon`
- `Supabase`
- `Railway`
- `Vercel Postgres`

Use the Neon values like this:

- `DATABASE_URL`: pooled URL
- `DIRECT_URL`: unpooled URL

## Step 2: Import The Project Into Vercel

1. Open Vercel.
2. Click `Add New Project`.
3. Import the GitHub repository.
4. Keep the framework as `Next.js`.

## Step 3: Set Environment Variables

Add these environment variables in Vercel:

```text
DATABASE_URL=postgresql://...pooled...
DIRECT_URL=postgresql://...unpooled...
APP_URL=https://your-vercel-domain.vercel.app

SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="StatusHub <alerts@your-company.com>"

XURRENT_WEBHOOK_SECRET=replace-with-a-long-random-secret
XURRENT_API_BASE_URL=
XURRENT_ACCOUNT_ID=
XURRENT_API_TOKEN=

DATADOG_WEBHOOK_SECRET=replace-with-a-long-random-secret
DATADOG_SITE=datadoghq.com
DATADOG_API_KEY=

DEV_EMAIL_MODE=false
SESSION_SECRET=replace-with-a-long-random-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-password
```

## Step 4: Build Settings

The repository already includes scripts for Vercel:

- `postinstall`: runs `prisma generate`
- `vercel-build`: runs `prisma generate && prisma migrate deploy && prisma db seed && next build`

You can keep Vercel's default install command.

If Vercel asks for a custom build command, use:

```text
npm run vercel-build
```

## Step 5: Deploy

Deploy the project once from Vercel.

StatusHub now runs these automatically during the Vercel build:

- `prisma migrate deploy`
- `prisma db seed`

That means once `DATABASE_URL` and `DIRECT_URL` are configured correctly, a normal redeploy should prepare the production database without extra terminal work.

## Step 6: Update APP_URL

Make sure `APP_URL` exactly matches your deployed Vercel URL or custom domain:

```text
https://your-vercel-domain.vercel.app
```

Then redeploy or restart so the app picks up the updated value.

## Step 7: Verify The App

Check:

```text
https://your-vercel-domain.vercel.app/api/health
```

You want:

- `ok: true`
- `database: ok`
- `deployment.ready: true`

## Step 8: Point 4me/Xurrent To Production

After deployment, use this webhook URL in 4me:

```text
https://your-vercel-domain.vercel.app/api/webhooks/xurrent
```

Header:

```text
x-xurrent-webhook-secret: YOUR_XURRENT_WEBHOOK_SECRET
```

## Production Notes

- `DEV_EMAIL_MODE` must be `false`
- `APP_URL` must be public HTTPS
- `DATABASE_URL` should use the pooled Neon connection
- `DIRECT_URL` should use the unpooled Neon connection
- use a strong `SESSION_SECRET`
- change the default admin password
- keep webhook secrets long and random

## AMOS Flow After Deployment

For `AMOS`:

1. 4me declares a major incident.
2. 4me sends the webhook to StatusHub.
3. StatusHub creates a pending approval intake.
4. You open `Automation`.
5. You approve the `AMOS` intake.
6. StatusHub maps:
   - outage or `P1` to `red`
   - performance or `P2` to `yellow`
7. StatusHub opens the compose flow with the seeded AMOS templates.

## If You Prefer Not To Use Vercel

Use:

- `Railway` if you want app and database together
- `Render` if you want a simple long-running web service
- a `VPS` if you want full control

The runtime requirements stay the same:

- Node.js
- PostgreSQL
- public HTTPS URL
- environment variables
