# Incident Communication Hub

Production-style local MVP for receiving approved Xurrent Major Incident webhooks, mapping them to internal applications, sending operator-controlled incident communications, and updating an internal status page.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL 16 with Docker Compose
- Zod validation
- Nodemailer with safe local development email mode
- Simple session auth for admin pages

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start PostgreSQL:

```bash
npm run db:up
```

PostgreSQL runs on `localhost:5432`.

3. Create your environment file:

```bash
copy .env.example .env
```

On macOS/Linux use:

```bash
cp .env.example .env
```

4. Run the Prisma migration:

```bash
npm run db:migrate
```

When prompted for a migration name, use something like:

```text
init
```

5. Seed local data:

```bash
npm run db:seed
```

6. Start the app:

```bash
npm run dev
```

7. Open the application:

```text
http://localhost:3000
```

Default local login:

```text
Username: admin
Password: admin
```

Change these values in `.env` before using the app beyond local development.

## Verification

Run static and production checks:

```bash
npm run lint
npm run build
```

Run the business-case regression suite while the app is running:

```bash
npm run test:business
```

The business suite creates temporary incidents, webhook events, and templates, then cleans up its own records.

## Docker Database

Docker Compose creates:

- Container: `incident_hub_db`
- Database: `incident_hub`
- User: `incident_user`
- Password: `incident_pass`
- Port: `5432`
- Persistent volume: `incident_hub_pgdata`

Stop the database:

```bash
npm run db:down
```

## Main Pages

- `/dashboard` - open incidents, app health, recent notifications, audit activity
- `/applications` - internal application catalog
- `/groups` - notification groups and members
- `/incident-types` - severity and routing configuration
- `/templates` - reusable email templates
- `/incidents` - incident list
- `/incidents/[id]` - operator controls, timeline, communication log
- `/status-page` - internal status page
- `/settings` - local configuration placeholders

## Webhook Endpoint

Xurrent webhook URL:

```text
POST http://localhost:3000/api/webhooks/xurrent
```

The payload is validated with Zod. The app stores every webhook event in `WebhookEvent` and prevents duplicate processing by `event_id` or a generated fallback id.

Datadog webhook URL:

```text
POST http://localhost:3000/api/webhooks/datadog
```

Health endpoint:

```text
GET http://localhost:3000/api/health
```

For production setup notes, environment variables, integration payloads, and hardening checklist, see:

```text
docs/production-readiness.md
```

Example local request:

```bash
curl -X POST http://localhost:3000/api/webhooks/xurrent ^
  -H "Content-Type: application/json" ^
  -H "x-xurrent-webhook-secret: change-me-local-secret" ^
  -d "{\"event_id\":\"evt-1001\",\"event_type\":\"request.updated\",\"request\":{\"id\":\"REQ-1001\",\"subject\":\"Website outage\",\"service\":\"Website\",\"priority\":\"P1\",\"major_incident_status\":\"approved\",\"environment\":\"production\",\"summary\":\"Customers cannot access the website.\",\"approved\":true,\"working_teams\":\"DevOps, Backend\",\"next_update_at\":\"2026-04-16T12:30:00.000Z\"}}"
```

PowerShell friendly simulator:

```powershell
Invoke-RestMethod -Method Post http://localhost:3000/api/dev/simulate-xurrent `
  -ContentType "application/json" `
  -Body '{"service":"Website","subject":"Website checkout errors"}'
```

The simulator only works while `NODE_ENV=development`.

## Email Modes

Local development defaults to:

```text
DEV_EMAIL_MODE=true
```

In this mode the app:

- does not require SMTP
- writes every outbound email to `IncidentNotification`
- logs the rendered message to the server console
- marks delivery status as `simulated`

For SMTP mode, set:

```text
DEV_EMAIL_MODE=false
SMTP_HOST=your-host
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-pass
SMTP_FROM="Incident Hub <incident@example.com>"
```

Email history is still stored in the database.

## Business Rules Implemented

- Only approved Major Incidents create or update incident records.
- Duplicate webhook events are ignored after first processing.
- Duplicate `started` emails are blocked for the same open incident.
- `resolved` emails require an existing open incident.
- Executive groups only receive notifications when the incident type allows executive notifications.
- Non-production webhook events are marked as non-production and remain safe in local email mode.
- Status page color can be manually overridden.
- Every outbound email is stored in database history.
- Major actions write to `AuditLog`.

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:up
npm run db:down
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Notes For Xurrent Integration

Mapping logic lives in:

```text
lib/xurrent-mapping.ts
```

Webhook processing lives in:

```text
lib/webhook-processing.ts
```

These files are intentionally small and easy to edit once the exact Xurrent payload shape is confirmed.
