import { PrismaClient } from "@prisma/client";
import { createHmac } from "crypto";

const prisma = new PrismaClient();
const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const adminUser = process.env.ADMIN_USERNAME ?? "admin";
const sessionSecret = process.env.SESSION_SECRET ?? "change-me-session-secret";
const xurrentSecret = process.env.XURRENT_WEBHOOK_SECRET ?? "change-me-local-secret";
const datadogSecret = process.env.DATADOG_WEBHOOK_SECRET ?? "change-me-datadog-secret";
const runId = `bc-${Date.now()}`;
const cookie = `incident_hub_session=${createHmac("sha256", sessionSecret).update(adminUser).digest("hex")}`;

type TestResult = {
  id: string;
  name: string;
  status: "PASS" | "FAIL";
  ms: number;
  error?: string;
};

const results: TestResult[] = [];
const created = {
  incidentIds: new Set<string>(),
  webhookEventIds: new Set<string>(),
  templateIds: new Set<string>()
};

async function http(path: string, options: RequestInit = {}) {
  const res = await fetch(`${baseUrl}${path}`, { redirect: "manual", ...options });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json: json as Record<string, unknown> | null };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function test(id: string, name: string, fn: () => Promise<void>) {
  const started = Date.now();
  try {
    await fn();
    results.push({ id, name, status: "PASS", ms: Date.now() - started });
  } catch (error) {
    results.push({ id, name, status: "FAIL", ms: Date.now() - started, error: error instanceof Error ? error.message : String(error) });
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

async function cleanup() {
  const incidentIds = [...created.incidentIds];
  const webhookEvents = await prisma.webhookEvent.findMany({
    where: {
      OR: [
        { externalEventId: { startsWith: runId } },
        { payloadJson: { path: ["request", "id"], equals: `${runId}-REQ-1` } },
        { payloadJson: { path: ["monitor_id"], equals: `${runId}-monitor-checkout` } }
      ]
    },
    select: { id: true }
  });
  for (const event of webhookEvents) created.webhookEventIds.add(event.id);

  const webhookEventIds = [...created.webhookEventIds];
  await prisma.pendingIncidentIntake.deleteMany({ where: { externalRequestId: { startsWith: runId } } });
  await prisma.externalServiceMapping.deleteMany({ where: { source: "xurrent", externalServiceName: { contains: runId } } });
  await prisma.incidentNotification.deleteMany({ where: { incidentId: { in: incidentIds } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ entityId: { in: incidentIds } }, { entityId: { in: webhookEventIds } }] } });
  await prisma.incident.deleteMany({ where: { id: { in: incidentIds } } });
  await prisma.webhookEvent.deleteMany({ where: { id: { in: webhookEventIds } } });
  await prisma.messageTemplate.deleteMany({ where: { id: { in: [...created.templateIds] } } });

  return {
    incidentIds: incidentIds.length,
    webhookEventIds: webhookEventIds.length,
    templateIds: created.templateIds.size
  };
}

async function main() {
  await test("BC-01", "Unauthenticated users are redirected from protected pages", async () => {
    const { res } = await http("/dashboard");
    assert(res.status === 307 || res.status === 308, `Expected redirect, got ${res.status}`);
    assert((res.headers.get("location") ?? "").includes("/login"), `Expected /login location, got ${res.headers.get("location")}`);
  });

  await test("BC-02", "Authenticated dashboard loads core command center", async () => {
    const { res, text } = await http("/dashboard", { headers: { cookie } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(text.includes("Incident communication control plane"), "Dashboard title missing");
    assert(text.includes("Next Best Actions"), "Action queue panel missing");
    assert(text.includes("Communication Coverage"), "Communication coverage panel missing");
    assert(text.includes("Simulate Xurrent major incident"), "Simulator quick action missing");
  });

  await test("BC-02A", "Admin access control page manages team users", async () => {
    const { res, text } = await http("/users", { headers: { cookie } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(text.includes("Team access"), "Access page title missing");
    assert(text.includes("Invite User"), "Invite user form missing");
    assert(text.includes("Role Guide"), "Role guide missing");
  });

  await test("BC-03", "Health endpoint reports deployment and database status", async () => {
    const { res, json } = await http("/api/health");
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json?.ok === true, "Health ok flag is not true");
    assert((json?.checks as Record<string, unknown>)?.database === "ok", "Database check is not ok");
  });

  await test("BC-04", "Integration Center exposes Xurrent, Datadog, and health configuration", async () => {
    const { res, text } = await http("/integrations", { headers: { cookie } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(text.includes("/api/webhooks/xurrent"), "Xurrent endpoint missing");
    assert(text.includes("/api/webhooks/datadog"), "Datadog endpoint missing");
    assert(text.includes("@webhook-statushub"), "Datadog monitor instruction missing");
  });

  await test("BC-04B", "Recipients page renders notification groups", async () => {
    const { res, text } = await http("/groups", { headers: { cookie } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(text.includes("Notification Groups"), "Recipients page title missing");
    assert(text.includes("New Group"), "New group form missing");
    assert(!text.includes("Something went wrong"), "Recipients page rendered the error boundary");
  });

  await test("BC-04A", "Service Catalog exposes dependency map administration", async () => {
    const { res, text } = await http("/applications", { headers: { cookie } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(text.includes("Dependency Map"), "Dependency map overview missing");
    assert(text.includes("Link Services"), "Dependency admin form missing");
    assert(text.includes("Parent service"), "Parent service selector missing");
    assert(text.includes("Child service"), "Child service selector missing");
    assert(text.includes("Active Dependency Links"), "Active dependency links list missing");
    assert(text.includes("Status Page Order"), "Status page order editor missing");
    assert(text.includes("Save status page order"), "Status page order save action missing");
  });

  await test("BC-05", "Xurrent approved major incident creates a pending approval intake", async () => {
    const payload = {
      event_id: `${runId}-xurrent-create`,
      event_type: "request.updated",
      request: {
        id: `${runId}-REQ-1`,
        subject: "Website checkout degraded",
        service: "Website",
        service_instance: `Website ${runId}`,
        priority: "P2",
        major_incident_status: "approved",
        environment: "production",
        summary: "Business case test: website checkout latency is elevated.",
        approved: true,
        working_teams: "Web Platform, SRE",
        next_update_at: "2026-04-17T08:30:00.000Z"
      }
    };
    const { res, json } = await http("/api/webhooks/xurrent", {
      method: "POST",
      headers: { "content-type": "application/json", "x-xurrent-webhook-secret": xurrentSecret },
      body: JSON.stringify(payload)
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const intakeId = stringValue(json?.intakeId);
    assert(intakeId, "Pending intake id missing");
    const intake = await prisma.pendingIncidentIntake.findUnique({ where: { id: intakeId }, include: { suggestedApplication: true } });
    assert(intake?.status === "pending", `Expected pending intake, got ${intake?.status}`);
    assert(intake?.suggestedApplication?.code === "WEB", `Expected WEB suggestion, got ${intake?.suggestedApplication?.code}`);
    assert((json?.incidentId ?? null) === null, "Incident should not be created before approval");
  });

  await test("BC-05A", "Automation center shows pending 4me intake for approval", async () => {
    const { res, text } = await http("/automation", { headers: { cookie } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(text.includes("Pending 4me Major Incidents"), "Pending intake section missing");
    assert(text.includes("Sync 4me services"), "4me service sync action missing");
    assert(text.includes(`Website ${runId}`), "4me service instance missing from pending intake");
    assert(text.includes("Approve intake"), "Approve intake action missing");
  });

  await test("BC-06", "Xurrent duplicate event is ignored without a second pending intake", async () => {
    const before = await prisma.pendingIncidentIntake.count({ where: { externalRequestId: `${runId}-REQ-1`, status: "pending" } });
    const payload = {
      event_id: `${runId}-xurrent-create`,
      event_type: "request.updated",
      request: { id: `${runId}-REQ-1`, subject: "Duplicate", service: "Payment", major_incident_status: "approved", approved: true }
    };
    const { res, json } = await http("/api/webhooks/xurrent", {
      method: "POST",
      headers: { "content-type": "application/json", "x-xurrent-webhook-secret": xurrentSecret },
      body: JSON.stringify(payload)
    });
    const after = await prisma.pendingIncidentIntake.count({ where: { externalRequestId: `${runId}-REQ-1`, status: "pending" } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json?.duplicate === true, "Duplicate flag was not true");
    assert(after === before, `Pending intake count changed from ${before} to ${after}`);
  });

  await test("BC-06A", "Compose flow presents approval-first communication pack", async () => {
    const incident = await prisma.incident.create({
      data: {
        xurrentRequestId: `${runId}-MANUAL-COMPOSE`,
        xurrentMajorIncidentStatus: "approved",
        applicationId: (await prisma.application.findFirstOrThrow({ where: { code: "WEB" } })).id,
        incidentTypeId: (await prisma.incidentType.findFirstOrThrow({ where: { name: "Full Outage" } })).id,
        currentStage: "started",
        currentColor: "red",
        title: "Manual compose verification",
        summary: "Manual compose verification summary.",
        workingTeams: "Web Platform",
        nextUpdateAt: new Date(Date.now() + 30 * 60 * 1000)
      }
    });
    created.incidentIds.add(incident.id);
    const { res, text } = await http(`/incidents/${incident.id}/compose/started`, { headers: { cookie } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(text.includes("Approval Required"), "Approval header missing");
    assert(text.includes("Communication Pack"), "Communication pack missing");
    assert(text.includes("I approve this communication"), "Approval checkbox missing");
    assert(text.includes("Approve and send"), "Approve send action missing");
  });

  await test("BC-07", "Xurrent request update modifies existing open incident", async () => {
    const application = await prisma.application.findFirstOrThrow({ where: { code: "WEB" } });
    const incidentType = await prisma.incidentType.findFirstOrThrow({ where: { name: "Full Outage" } });
    const openIncident = await prisma.incident.create({
      data: {
        xurrentRequestId: `${runId}-REQ-1`,
        xurrentMajorIncidentStatus: "approved",
        applicationId: application.id,
        incidentTypeId: incidentType.id,
        currentStage: "started",
        currentColor: "yellow",
        title: "Open incident for update flow",
        summary: "Initial summary",
        workingTeams: "Web Platform"
      }
    });
    created.incidentIds.add(openIncident.id);
    const payload = {
      event_id: `${runId}-xurrent-update`,
      event_type: "request.updated",
      request: {
        id: `${runId}-REQ-1`,
        subject: "Website checkout degraded - update",
        service: "Website",
        priority: "P1",
        major_incident_status: "approved",
        environment: "production",
        summary: "Business case test: website issue impact increased.",
        approved: true,
        working_teams: "Web Platform, SRE, Database"
      }
    };
    const { res, json } = await http("/api/webhooks/xurrent", {
      method: "POST",
      headers: { "content-type": "application/json", "x-xurrent-webhook-secret": xurrentSecret },
      body: JSON.stringify(payload)
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const incidentId = stringValue(json?.incidentId);
    created.incidentIds.add(incidentId);
    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    assert(incident?.currentStage === "update", `Expected update stage, got ${incident?.currentStage}`);
    assert(incident?.currentColor === "red", `Expected P1 update to be red, got ${incident?.currentColor}`);
    assert(incident?.summary.includes("impact increased"), "Summary was not updated");
  });

  await test("BC-08", "Datadog alert creates incident and recovery resolves it", async () => {
    const alertPayload = {
      event_id: `${runId}-datadog-alert`,
      monitor_id: `${runId}-monitor-checkout`,
      alert_transition: "Triggered",
      alert_status: "Alert",
      title: "Website checkout 500 rate high",
      message: "Business case test: checkout errors above threshold.",
      priority: "P1",
      service: "Website",
      tags: ["service:Website", "env:prod"]
    };
    const alert = await http("/api/webhooks/datadog", {
      method: "POST",
      headers: { "content-type": "application/json", "x-statushub-secret": datadogSecret },
      body: JSON.stringify(alertPayload)
    });
    assert(alert.res.status === 200, `Expected alert 200, got ${alert.res.status}`);
    const incidentId = stringValue(alert.json?.incidentId);
    assert(incidentId, "Datadog alert incident id missing");
    created.incidentIds.add(incidentId);

    const recoveryPayload = { ...alertPayload, event_id: `${runId}-datadog-recovery`, alert_transition: "Recovered", alert_status: "OK", title: "Website checkout recovered", message: "Business case test: checkout recovered." };
    const recovery = await http("/api/webhooks/datadog", {
      method: "POST",
      headers: { "content-type": "application/json", "x-statushub-secret": datadogSecret },
      body: JSON.stringify(recoveryPayload)
    });
    assert(recovery.res.status === 200, `Expected recovery 200, got ${recovery.res.status}`);
    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    assert(incident?.isOpen === false, "Datadog incident did not resolve");
    assert(incident?.currentColor === "green", `Expected green, got ${incident?.currentColor}`);
  });

  await test("BC-09", "Status page reflects active incident state", async () => {
    const { res, text } = await http("/status-page", { headers: { cookie } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(text.includes("System Health Overview"), "Status page header missing");
    assert(text.includes("Affected dependencies"), "Nested dependency toggle missing");
    assert(text.includes("Booking funnel") || text.includes("Checkout"), "Nested dependency status row missing");
    assert(text.includes("Website"), "Website app missing from status page");
    assert(text.includes("Business case test: website issue impact increased."), "Active Xurrent incident summary missing");
  });

  await test("BC-09A", "Xurrent closure resolves the open major incident", async () => {
    const payload = {
      event_id: `${runId}-xurrent-resolved`,
      event_type: "request.completed",
      request: {
        id: `${runId}-REQ-1`,
        subject: "Website checkout restored",
        service: "Website",
        priority: "P1",
        major_incident_status: "completed",
        status: "completed",
        environment: "production",
        summary: "Business case test: website service restored.",
        completed_at: "2026-04-17T09:10:00.000Z"
      }
    };
    const { res, json } = await http("/api/webhooks/xurrent", {
      method: "POST",
      headers: { "content-type": "application/json", "x-xurrent-webhook-secret": xurrentSecret },
      body: JSON.stringify(payload)
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const incidentId = stringValue(json?.incidentId);
    assert(incidentId, "Resolved incident id missing");
    created.incidentIds.add(incidentId);
    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    assert(incident?.isOpen === false, "Xurrent closure did not close the incident");
    assert(incident?.currentStage === "resolved", `Expected resolved stage, got ${incident?.currentStage}`);
    assert(incident?.currentColor === "green", `Expected green after closure, got ${incident?.currentColor}`);
  });

  await test("BC-10", "Template validation shows user-friendly error and accepts short body content", async () => {
    const { res, text } = await http("/templates?error=bodyHtmlTemplate%3A%20HTML%20body%20is%20required.", { headers: { cookie } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(text.includes("HTML body is required"), "Friendly template error missing");
    assert(!text.includes("too_small"), "Raw Zod code leaked");
    const template = await prisma.messageTemplate.create({
      data: {
        stage: "update",
        subjectTemplate: `[${runId}] Test`,
        bodyHtmlTemplate: "x",
        bodyTextTemplate: "y",
        isDefault: false
      }
    });
    created.templateIds.add(template.id);
  });

  const webhookEvents = await prisma.webhookEvent.findMany({
    where: { externalEventId: { startsWith: runId } },
    select: { id: true }
  });
  for (const event of webhookEvents) created.webhookEventIds.add(event.id);

  const auditCount = await prisma.auditLog.count({
    where: { OR: [{ entityId: { in: [...created.incidentIds] } }, { entityId: { in: [...created.webhookEventIds] } }] }
  });
  results.push({
    id: "AUDIT-CHECK",
    name: "Audit records exist for tested incident/webhook flows",
    status: auditCount > 0 ? "PASS" : "FAIL",
    ms: 0,
    ...(auditCount > 0 ? {} : { error: "No audit records found" })
  });

  const cleanupResult = await cleanup();
  const failed = results.filter((result) => result.status === "FAIL").length;
  console.log(JSON.stringify({ runId, passed: results.length - failed, failed, results, cleanup: cleanupResult }, null, 2));
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
