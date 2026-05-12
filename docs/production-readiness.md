# StatusHub Production Readiness

StatusHub is an internal incident communication and status dashboard for Xurrent ITSM major incidents, Datadog monitor alerts, operator-controlled messaging, and application health visibility.

## Local Verification

Start the database and app:

```bash
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

Run quality checks:

```bash
npm run lint
npm run build
npm run test:business
```

`npm run test:business` exercises the critical business flows and cleans up its own test records.

## Xurrent ITSM Setup

Webhook endpoint:

```text
POST {APP_URL}/api/webhooks/xurrent
```

Recommended shared-secret header:

```text
x-xurrent-webhook-secret: {XURRENT_WEBHOOK_SECRET}
```

Supported signature headers:

```text
x-xurrent-signature
x-hub-signature-256
```

Expected behavior:

- Approved major incidents create or update open incidents.
- Duplicate `event_id` values are idempotently ignored.
- Non-major incidents are processed, audited, and ignored.
- Production incidents use the mapped incident type color.
- Non-production incidents are marked yellow and prefixed in the summary.
- Unknown services fall back to the first active application, or an unmapped application if none exist.

## Datadog Setup

Webhook endpoint:

```text
POST {APP_URL}/api/webhooks/datadog
```

Recommended custom header:

```json
{"x-statushub-secret":"{DATADOG_WEBHOOK_SECRET}"}
```

Monitor notification usage:

```text
@webhook-statushub
```

Suggested Datadog custom payload:

```json
{
  "monitor_id": "$ALERT_ID",
  "alert_transition": "$ALERT_TRANSITION",
  "alert_status": "$ALERT_STATUS",
  "title": "$EVENT_TITLE",
  "message": "$TEXT_ONLY_MSG",
  "priority": "$PRIORITY",
  "service": "Website",
  "tags": "$TAGS"
}
```

Expected behavior:

- Alert transitions create or update open incidents.
- Recovery/OK transitions resolve the matching incident.
- Mapping can use `service`, `app`, `application`, or tags such as `service:Website`.
- Duplicate events are idempotently ignored.
- Missing or invalid secrets return `401`.

## Health Endpoint

Endpoint:

```text
GET {APP_URL}/api/health
```

The response includes:

- database check
- Xurrent secret readiness
- Datadog secret readiness
- email mode
- active applications
- open incidents
- failed webhooks

Use it for a load balancer, Uptime Kuma, Datadog synthetic/API test, or a deployment smoke test.

## Environment Variables

Required for local development:

```text
DATABASE_URL
APP_URL
SESSION_SECRET
ADMIN_USERNAME
ADMIN_PASSWORD
XURRENT_WEBHOOK_SECRET
DATADOG_WEBHOOK_SECRET
DEV_EMAIL_MODE
```

SMTP production variables:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
```

Xurrent outbound API placeholders:

```text
XURRENT_API_BASE_URL
XURRENT_API_TOKEN
```

Datadog placeholders:

```text
DATADOG_SITE
DATADOG_API_KEY
```

Do not display secret values in the UI. Show only configured/not configured.

## Business Regression Suite

`npm run test:business` currently verifies:

1. Unauthenticated users are redirected from protected pages.
2. Authenticated dashboard loads core command center content.
3. Health endpoint reports database and integration readiness.
4. Integration Center exposes Xurrent, Datadog, and health configuration.
5. Xurrent approved major incident creates an open incident.
6. Xurrent duplicate event is ignored without a second incident.
7. Xurrent request update modifies the existing open incident.
8. Datadog alert creates an incident and recovery resolves it.
9. Status page reflects active incident state.
10. Template validation shows user-friendly error and accepts short valid body content.
11. Audit records exist for tested incident/webhook flows.

## Production Hardening Checklist

- Replace simple session auth with enterprise SSO or IdP integration.
- Add CSRF protection for browser-submitted server actions.
- Add role-based permissions for admin, operator, and viewer personas.
- Store secrets in a managed secret store.
- Add structured logs and request correlation IDs.
- Add database backup and migration runbooks.
- Add rate limiting to webhook endpoints.
- Add webhook replay protection beyond duplicate event IDs if upstream supports timestamps.
- Add notification preview and approval workflow.
- Add Playwright UI tests for key operator flows.
- Add deployment pipeline checks for lint, build, and business regression tests.
