# AMOS 4me Major Incident Setup

This guide shows how to connect 4me/Xurrent major incidents for the `AMOS` application into StatusHub with an approval-first workflow.

## What You Will Get

When 4me declares a Major Incident for `AMOS`:

1. 4me sends the webhook to StatusHub.
2. StatusHub creates a `pending approval` intake instead of publishing immediately.
3. An operator opens `Automation` in StatusHub.
4. The operator confirms the intake and maps it to the `AMOS` service.
5. StatusHub opens the incident internally.
6. The status page becomes:
   - `yellow` for performance or degradation cases
   - `red` for outage or critical unavailability cases
7. The operator then opens the communication compose screen and sends the approved message.

This keeps 4me as the source of truth while StatusHub controls what gets published.

## StatusHub Side Prerequisites

Make sure these values are configured in `.env`:

```text
APP_URL=http://localhost:3001
XURRENT_WEBHOOK_SECRET=your-shared-secret
SESSION_SECRET=your-session-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-admin-password
```

If you want live emails:

```text
DEV_EMAIL_MODE=false
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="StatusHub <alerts@your-company.com>"
```

## Seeded AMOS Service

The seed now includes:

- Application: `AMOS`
- Code: `AMOS`
- Owner team: `AMOS Platform`
- Technical group: `AMOS Technical Team`

Run the seed again if needed:

```bash
npm run db:seed
```

## Recommended 4me Naming

To make mapping easy, use one of these names in 4me:

- `AMOS`
- `AMOS Production`
- `AMOS Core`

StatusHub tries to match by service name, service instance name, and incident subject.

## How StatusHub Decides Yellow vs Red

StatusHub already maps incoming 4me data like this:

- `red`
  - `P1`
  - `critical`
  - `outage`
  - `down`
  - `unavailable`

- `yellow`
  - `P2`
  - `high`
  - `degraded`
  - `degradation`
  - `slow`
  - `performance`
  - `latency`

So for your AMOS scenario:

- use `P1` or outage wording for `red`
- use `P2` or performance wording for `yellow`

## Example 4me Payloads

### Red / outage example

```json
{
  "event_id": "amos-outage-1001",
  "event_type": "request.updated",
  "request": {
    "id": "REQ-AMOS-1001",
    "subject": "AMOS outage affecting operational workflows",
    "service": "AMOS",
    "service_instance": "AMOS Production",
    "priority": "P1",
    "major_incident_status": "approved",
    "environment": "production",
    "summary": "AMOS is unavailable for core operational users.",
    "approved": true,
    "working_teams": "AMOS Platform, Infrastructure",
    "next_update_at": "2026-05-12T22:00:00.000Z"
  }
}
```

### Yellow / performance example

```json
{
  "event_id": "amos-performance-1002",
  "event_type": "request.updated",
  "request": {
    "id": "REQ-AMOS-1002",
    "subject": "AMOS performance degradation",
    "service": "AMOS",
    "service_instance": "AMOS Production",
    "priority": "P2",
    "major_incident_status": "approved",
    "environment": "production",
    "summary": "AMOS is responding slowly and some workflows are delayed.",
    "approved": true,
    "working_teams": "AMOS Platform, Database",
    "next_update_at": "2026-05-12T22:30:00.000Z"
  }
}
```

## StatusHub Operator Flow

When the webhook arrives:

1. Open `Automation`
2. Find the new `4me pending` intake
3. Confirm the service is `AMOS`
4. Select `AMOS` in the service mapping dropdown if it is not already selected
5. Leave `Remember mapping` enabled
6. Click `Approve intake`
7. StatusHub will open the incident and redirect you to the compose screen
8. Review the message
9. Approve and send the communication

## Suggested AMOS Communication Scenarios

### Scenario 1: Performance issue

Use when AMOS is available but slow.

- Incident type: `Performance Issue`
- Expected public color: `yellow`
- Example customer summary:
  `AMOS is experiencing degraded performance. Users may see slower response times while teams work on stabilization.`

### Scenario 2: Full outage

Use when AMOS is unavailable or critical workflows are blocked.

- Incident type: `Full Outage`
- Expected public color: `red`
- Example customer summary:
  `AMOS is currently unavailable. Operational workflows may be interrupted while engineering teams work on restoration.`

## 4me Setup: Explain Like I Am Five

Think of 4me as the place where the incident is born, and StatusHub as the place where the message is safely released.

You want 4me to do this:

`When AMOS becomes a major incident, send the details to StatusHub.`

### Step by step

1. Open 4me.
2. Go to the place where webhooks or outgoing calls are configured.
3. Create a new webhook.
4. Set the method to `POST`.
5. Paste this URL:

```text
http://localhost:3001/api/webhooks/xurrent
```

If StatusHub is hosted publicly later, replace `localhost` with your real domain.

6. Add this HTTP header:

```text
x-xurrent-webhook-secret: YOUR_SECRET_HERE
```

`YOUR_SECRET_HERE` must be exactly the same value as `XURRENT_WEBHOOK_SECRET` in StatusHub.

7. Tell 4me to send the webhook when:
   - the request is a major incident
   - and it becomes approved

8. Make sure the payload includes these fields:
   - request id
   - subject
   - service or service instance
   - priority
   - major incident status
   - environment
   - summary
   - approved flag
   - working teams
   - next update time

9. Save the webhook.

10. In 4me, create a test major incident for `AMOS`.

11. Open StatusHub.

12. Go to `Automation`.

13. You should see a pending intake waiting for your approval.

14. Approve it.

15. StatusHub will then let you decide what message gets published and emailed.

That is the whole trick:

- 4me says: `there is a major incident`
- StatusHub says: `okay, I will wait for your publishing approval`

## Important Rule

Do not configure 4me to directly publish customer communication.

Let 4me create the major incident.
Let StatusHub control:

- status color
- stakeholder messaging
- message approval
- public status release

That is what keeps the process safe.
