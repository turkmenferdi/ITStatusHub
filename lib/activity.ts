import type { AuditLog } from "@prisma/client";

type JsonMap = Record<string, unknown>;

function asMap(value: unknown): JsonMap {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonMap) : {};
}

function numberOf(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

export function activityPresentation(item: Pick<AuditLog, "action" | "actorName" | "payloadJson">) {
  const payload = asMap(item.payloadJson);

  switch (item.action) {
    case "incident.created_from_webhook":
      return {
        title: "Incident created from Xurrent",
        detail: `Mapped to ${String(payload.application ?? "an application")} as ${String(payload.incidentType ?? "an incident type")}.`,
        tone: "blue"
      };
    case "incident.updated_from_webhook":
      return {
        title: "Incident updated from Xurrent",
        detail: `Latest Xurrent update refreshed ${String(payload.application ?? "the application")} status.`,
        tone: "blue"
      };
    case "incident.created_from_datadog":
      return {
        title: "Datadog alert opened an incident",
        detail: `Monitor ${String(payload.monitor ?? "alert")} mapped to ${String(payload.application ?? "an application")}.`,
        tone: "purple"
      };
    case "incident.updated_from_datadog":
      return {
        title: "Datadog alert updated an incident",
        detail: `Monitor ${String(payload.monitor ?? "alert")} sent a new alert state.`,
        tone: "purple"
      };
    case "incident.resolved_from_datadog":
      return {
        title: "Datadog recovery resolved an incident",
        detail: `Monitor ${String(payload.monitor ?? "alert")} reported recovery.`,
        tone: "green"
      };
    case "incident.send_started":
      return {
        title: "Started notification sent",
        detail: `${numberOf(payload.notificationIds)} notification${numberOf(payload.notificationIds) === 1 ? "" : "s"} recorded.`,
        tone: "green"
      };
    case "incident.send_update":
      return {
        title: "Update notification sent",
        detail: `${numberOf(payload.notificationIds)} stakeholder group${numberOf(payload.notificationIds) === 1 ? "" : "s"} notified.`,
        tone: "green"
      };
    case "incident.send_resolved":
      return {
        title: "Resolved notification sent",
        detail: `${numberOf(payload.notificationIds)} notification${numberOf(payload.notificationIds) === 1 ? "" : "s"} recorded and incident marked resolved.`,
        tone: "green"
      };
    case "incident.send_maintenance":
      return {
        title: "Maintenance notification sent",
        detail: `${numberOf(payload.notificationIds)} maintenance audience notification${numberOf(payload.notificationIds) === 1 ? "" : "s"} recorded.`,
        tone: "blue"
      };
    case "incident.status_color_changed":
      return {
        title: "Status color changed",
        detail: `Operator changed status to ${String(payload.color ?? "a new value")}.`,
        tone: "amber"
      };
    case "incident.manual_note":
      return {
        title: "Manual note added",
        detail: String(payload.note ?? "Internal note recorded."),
        tone: "slate"
      };
    case "webhook.duplicate_ignored":
      return {
        title: "Duplicate webhook ignored",
        detail: `Event ${String(payload.externalEventId ?? "without id")} was already processed.`,
        tone: "slate"
      };
    case "webhook.non_major_incident_ignored":
      return {
        title: "Non-major incident ignored",
        detail: `Xurrent request ${String(payload.requestId ?? "")} did not meet major incident criteria.`,
        tone: "slate"
      };
    default:
      return {
        title: item.action.replaceAll("_", " ").replaceAll(".", " - "),
        detail: `Recorded by ${item.actorName}.`,
        tone: "slate"
      };
  }
}

export function activityToneClasses(tone: string) {
  const tones: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    blue: "bg-sky-50 text-sky-700 border-sky-100",
    purple: "bg-violet-50 text-violet-700 border-violet-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100"
  };
  return tones[tone] ?? tones.slate;
}
