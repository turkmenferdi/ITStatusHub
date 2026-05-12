import { Prisma, type IncidentType, type StatusColor } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { datadogWebhookSchema } from "@/lib/validation";

type DatadogPayload = ReturnType<typeof datadogWebhookSchema.parse>;

function normalizeTags(tags: DatadogPayload["tags"]) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
}

function tagValue(tags: string[], keys: string[]) {
  const match = tags.find((tag) => keys.some((key) => tag.toLowerCase().startsWith(`${key}:`)));
  return match?.split(":").slice(1).join(":").trim();
}

function textIncludes(source: string, words: string[]) {
  const haystack = source.toLowerCase();
  return words.some((word) => haystack.includes(word.toLowerCase()));
}

async function mapApplication(payload: DatadogPayload) {
  const tags = normalizeTags(payload.tags);
  const source = [payload.service, payload.app, payload.application, tagValue(tags, ["service", "app", "application"]), payload.title, payload.alert_title, tags.join(" ")].filter(Boolean).join(" ");
  const apps = await prisma.application.findMany({ where: { isActive: true } });
  return (
    apps.find((app) => textIncludes(source, [app.name, app.code])) ??
    apps[0] ??
    (await prisma.application.create({
      data: {
        name: "Unmapped Application",
        code: "UNMAPPED",
        ownerTeam: "Operations",
        statusPageLabel: "Unmapped Application",
        defaultStatus: "yellow"
      }
    }))
  );
}

async function mapIncidentType(payload: DatadogPayload): Promise<IncidentType> {
  const source = [payload.priority, payload.severity, payload.title, payload.alert_title, payload.message, payload.body, normalizeTags(payload.tags).join(" ")].filter(Boolean).join(" ");
  const types = await prisma.incidentType.findMany();
  const outage = types.find((type) => type.name.toLowerCase().includes("outage"));
  const degraded = types.find((type) => type.name.toLowerCase().includes("degradation"));

  if (textIncludes(source, ["p1", "sev1", "critical", "outage", "down", "alert"])) return outage ?? types[0];
  return degraded ?? types[0];
}

function transitionState(payload: DatadogPayload) {
  const raw = [payload.alert_transition, payload.alert_status, payload.severity].filter(Boolean).join(" ").toLowerCase();
  if (textIncludes(raw, ["recovered", "resolved", "ok"])) return "recovered";
  if (textIncludes(raw, ["warn", "warning"])) return "warning";
  return "alert";
}

function eventId(payload: DatadogPayload) {
  return payload.event_id ?? payload.id ?? `${payload.monitor_id ?? payload.alert_id ?? "monitor"}:${payload.alert_transition ?? payload.alert_status ?? "event"}:${payload.date ?? Date.now()}`;
}

function monitorKey(payload: DatadogPayload) {
  return `datadog:${payload.monitor_id ?? payload.alert_id ?? payload.id ?? eventId(payload)}`;
}

function statusForDatadog(state: string, incidentType: IncidentType): StatusColor {
  if (state === "warning") return "yellow";
  return incidentType.defaultColor;
}

export async function processDatadogWebhook(rawPayload: unknown, signature?: string | null) {
  const payload = datadogWebhookSchema.parse(rawPayload);
  const externalEventId = eventId(payload);

  let event = await prisma.webhookEvent.findUnique({
    where: { source_externalEventId: { source: "datadog", externalEventId } }
  });

  if (event?.processed) {
    await auditLog({
      actorType: "webhook",
      actorName: "datadog",
      action: "webhook.duplicate_ignored",
      entityType: "WebhookEvent",
      entityId: event.id,
      payload: { externalEventId }
    });
    return { event, duplicate: true, incident: null };
  }

  if (!event) {
    event = await prisma.webhookEvent.create({
      data: {
        source: "datadog",
        externalEventId,
        eventType: payload.alert_transition ?? payload.alert_status ?? "monitor.event",
        payloadJson: rawPayload as Prisma.InputJsonValue,
        signature
      }
    });
  }

  try {
    const state = transitionState(payload);
    const requestId = monitorKey(payload);
    const existingOpen = await prisma.incident.findFirst({ where: { xurrentRequestId: requestId, isOpen: true } });

    if (state === "recovered") {
      const incident = existingOpen
        ? await prisma.incident.update({
            where: { id: existingOpen.id },
            data: { currentStage: "resolved", currentColor: "green", isOpen: false, resolvedAt: new Date(), summary: payload.message ?? payload.body ?? existingOpen.summary }
          })
        : null;

      const processed = await prisma.webhookEvent.update({ where: { id: event.id }, data: { processed: true, processedAt: new Date() } });
      await auditLog({
        actorType: "webhook",
        actorName: "datadog",
        action: incident ? "incident.resolved_from_datadog" : "datadog.recovery_without_open_incident",
        entityType: incident ? "Incident" : "WebhookEvent",
        entityId: incident?.id ?? event.id,
        payload: { externalEventId, monitor: requestId }
      });
      return { event: processed, duplicate: false, incident };
    }

    const [application, incidentType] = await Promise.all([mapApplication(payload), mapIncidentType(payload)]);
    const title = payload.title ?? payload.alert_title ?? `Datadog monitor ${payload.monitor_id ?? payload.alert_id ?? "alert"}`;
    const summary = payload.message ?? payload.body ?? payload.text ?? "Datadog monitor alert received.";
    const incident = existingOpen
      ? await prisma.incident.update({
          where: { id: existingOpen.id },
          data: {
            applicationId: application.id,
            incidentTypeId: incidentType.id,
            currentStage: "update",
            currentColor: statusForDatadog(state, incidentType),
            title,
            summary,
            workingTeams: application.ownerTeam,
            nextUpdateAt: null
          }
        })
      : await prisma.incident.create({
          data: {
            xurrentRequestId: requestId,
            xurrentMajorIncidentStatus: "datadog-alert",
            applicationId: application.id,
            incidentTypeId: incidentType.id,
            currentStage: "started",
            currentColor: statusForDatadog(state, incidentType),
            title,
            summary,
            workingTeams: application.ownerTeam,
            nextUpdateAt: null
          }
        });

    const processed = await prisma.webhookEvent.update({ where: { id: event.id }, data: { processed: true, processedAt: new Date() } });
    await auditLog({
      actorType: "webhook",
      actorName: "datadog",
      action: existingOpen ? "incident.updated_from_datadog" : "incident.created_from_datadog",
      entityType: "Incident",
      entityId: incident.id,
      payload: { webhookEventId: event.id, monitor: requestId, application: application.code, incidentType: incidentType.name }
    });

    return { event: processed, duplicate: false, incident };
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { processingError: error instanceof Error ? error.message : "Unknown processing error" }
    });
    throw error;
  }
}
