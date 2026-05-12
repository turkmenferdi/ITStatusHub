import type { IncidentType, Application, StatusColor } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { xurrentWebhookSchema } from "@/lib/validation";

export type XurrentPayload = ReturnType<typeof xurrentWebhookSchema.parse>;

function textIncludes(source: string | undefined, words: string[]) {
  const haystack = source?.toLowerCase() ?? "";
  return words.some((word) => haystack.includes(word));
}

export function isApprovedMajorIncident(payload: XurrentPayload) {
  const status = payload.request.major_incident_status?.toLowerCase() ?? "";
  return payload.request.approved === true || status.includes("approved");
}

export function isResolvedMajorIncident(payload: XurrentPayload) {
  const source = [payload.request.major_incident_status, payload.request.status, payload.request.state, payload.event_type].filter(Boolean).join(" ").toLowerCase();
  return ["completed", "complete", "closed", "resolved", "cancelled", "canceled", "finished"].some((word) => source.includes(word));
}

export function isProductionIncident(payload: XurrentPayload) {
  const env = payload.request.environment?.toLowerCase() ?? "production";
  return !["test", "dev", "development", "staging", "non-production", "nonprod"].some((value) => env.includes(value));
}

export function xurrentServiceName(payload: XurrentPayload) {
  return payload.request.service_instance?.trim() || payload.request.service?.trim() || "Unmapped 4me Service";
}

export async function mapApplication(payload: XurrentPayload): Promise<Application> {
  const serviceName = xurrentServiceName(payload);
  const mapping = await prisma.externalServiceMapping.findUnique({
    where: { source_externalServiceName: { source: "xurrent", externalServiceName: serviceName } },
    include: { application: true }
  });
  if (mapping?.application.isActive) return mapping.application;

  const source = [payload.request.service, payload.request.service_instance, payload.request.subject].filter(Boolean).join(" ");
  const apps = await prisma.application.findMany({ where: { isActive: true } });
  return (
    apps.find((app) => textIncludes(source, [app.name, app.code].map((value) => value.toLowerCase()))) ??
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

export async function suggestApplication(payload: XurrentPayload): Promise<Application | null> {
  const serviceName = xurrentServiceName(payload);
  const mapping = await prisma.externalServiceMapping.findUnique({
    where: { source_externalServiceName: { source: "xurrent", externalServiceName: serviceName } },
    include: { application: true }
  });
  if (mapping?.application.isActive) return mapping.application;

  const source = [payload.request.service, payload.request.service_instance, payload.request.subject].filter(Boolean).join(" ");
  const apps = await prisma.application.findMany({ where: { isActive: true } });
  return apps.find((app) => textIncludes(source, [app.name, app.code].map((value) => value.toLowerCase()))) ?? null;
}

export async function mapIncidentType(payload: XurrentPayload): Promise<IncidentType> {
  const source = [payload.request.priority, payload.request.subject, payload.request.summary, payload.request.major_incident_status].filter(Boolean).join(" ");
  const types = await prisma.incidentType.findMany();
  const maintenance = types.find((type) => type.isMaintenance);
  const outage = types.find((type) => type.name.toLowerCase().includes("outage"));
  const performance = types.find((type) => type.name.toLowerCase().includes("performance"));
  const degraded = types.find((type) => type.name.toLowerCase().includes("degradation"));

  if (textIncludes(source, ["maintenance", "planned"])) return maintenance ?? types[0];
  if (textIncludes(source, ["p1", "sev1", "critical", "outage", "down"])) return outage ?? types[0];
  if (textIncludes(source, ["performance", "latency", "slow", "slowness", "yavas", "yavaslik"])) return performance ?? degraded ?? types[0];
  return degraded ?? types[0];
}

export function statusForXurrentPriority(payload: XurrentPayload, type: IncidentType): StatusColor {
  const source = [payload.request.priority, payload.request.subject, payload.request.summary, payload.request.major_incident_status].filter(Boolean).join(" ").toLowerCase();
  if (["p1", "sev1", "critical", "outage", "down", "unavailable"].some((word) => source.includes(word))) return "red";
  if (["p2", "sev2", "high", "degraded", "degradation", "slow"].some((word) => source.includes(word))) return "yellow";
  return type.defaultColor;
}

export function eventIdFromPayload(payload: XurrentPayload) {
  return payload.event_id ?? payload.id ?? `${payload.request.id}:${payload.event_type}:${payload.request.major_incident_status ?? "unknown"}`;
}
