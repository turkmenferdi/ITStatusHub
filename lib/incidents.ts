import type { ActorType, Incident, IncidentStage, StatusColor } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { deliverIncidentEmail, deliverSubscriberNotifications } from "@/lib/email";
import { findBestTemplate, renderTemplate } from "@/lib/template";
import type { TemplateContext } from "@/types/incidents";

export async function buildTemplateContext(incident: Incident): Promise<TemplateContext> {
  const [application, incidentType] = await Promise.all([
    prisma.application.findUniqueOrThrow({ where: { id: incident.applicationId } }),
    prisma.incidentType.findUniqueOrThrow({ where: { id: incident.incidentTypeId } })
  ]);

  return {
    app_name: application.name,
    incident_type: incidentType.name,
    title: incident.title,
    summary: incident.summary,
    working_teams: incident.workingTeams,
    next_update_at: incident.nextUpdateAt?.toISOString() ?? "To be confirmed",
    stage: incident.currentStage,
    status_color: incident.currentColor
  };
}

export async function recipientGroupsForIncident(incident: Incident, stage: IncidentStage) {
  const incidentType = await prisma.incidentType.findUniqueOrThrow({ where: { id: incident.incidentTypeId } });
  const rule = await prisma.applicationGroupRule.findUnique({
    where: { applicationId_incidentTypeId: { applicationId: incident.applicationId, incidentTypeId: incident.incidentTypeId } },
    include: {
      technicalGroup: { include: { members: { where: { isActive: true }, orderBy: { email: "asc" } } } },
      businessGroup: { include: { members: { where: { isActive: true }, orderBy: { email: "asc" } } } },
      executiveGroup: { include: { members: { where: { isActive: true }, orderBy: { email: "asc" } } } },
      maintenanceGroup: { include: { members: { where: { isActive: true }, orderBy: { email: "asc" } } } }
    }
  });

  const groups = [];
  if (stage === "maintenance" || incidentType.isMaintenance) {
    if (rule?.maintenanceGroup?.isActive) groups.push(rule.maintenanceGroup);
    if (groups.length === 0) {
      groups.push(...await prisma.notificationGroup.findMany({
        where: { groupType: "maintenance", isActive: true },
        include: { members: { where: { isActive: true }, orderBy: { email: "asc" } } }
      }));
    }
    return groups;
  }
  if (incidentType.notifyTechnical && rule?.technicalGroup?.isActive) groups.push(rule.technicalGroup);
  if (incidentType.notifyBusiness && rule?.businessGroup?.isActive) groups.push(rule.businessGroup);
  if (incidentType.notifyExecutive && rule?.executiveGroup?.isActive) groups.push(rule.executiveGroup);
  if (groups.length === 0) {
    const groupTypes = [
      incidentType.notifyTechnical ? "technical" : null,
      incidentType.notifyBusiness ? "business" : null,
      incidentType.notifyExecutive ? "executive" : null
    ].filter((groupType): groupType is "technical" | "business" | "executive" => Boolean(groupType));
    groups.push(...await prisma.notificationGroup.findMany({
      where: { groupType: { in: groupTypes }, isActive: true },
      include: { members: { where: { isActive: true }, orderBy: { email: "asc" } } }
    }));
  }
  return groups;
}

export async function sendIncidentStage(incidentId: string, stage: IncidentStage) {
  return announceIncidentStage(incidentId, stage, { actorType: "user", actorName: "operator" });
}

export async function renderIncidentStageDraft(incidentId: string, stage: IncidentStage) {
  const incident = await prisma.incident.findUniqueOrThrow({ where: { id: incidentId } });
  const template = await findBestTemplate({
    applicationId: incident.applicationId,
    incidentTypeId: incident.incidentTypeId,
    stage
  });
  if (!template) throw new Error(`No ${stage} template is configured.`);

  const context = await buildTemplateContext({ ...incident, currentStage: stage });
  return {
    incident,
    template,
    rendered: renderTemplate(template, context)
  };
}

export async function announceIncidentStage(
  incidentId: string,
  stage: IncidentStage,
  actor: { actorType: ActorType; actorName: string } = { actorType: "system", actorName: "automation" },
  override?: { subject: string; html: string; text: string }
) {
  const incident = await prisma.incident.findUniqueOrThrow({ where: { id: incidentId } });

  if (stage === "started") {
    const existingStarted = await prisma.incidentNotification.findFirst({
      where: { incidentId, stage: "started", deliveryStatus: { in: ["sent", "simulated"] } }
    });
    if (existingStarted) {
      return incident;
    }
  }

  if (stage === "resolved" && !incident.isOpen) {
    return incident;
  }

  const rendered = override ?? (await renderIncidentStageDraft(incidentId, stage)).rendered;
  const groups = await recipientGroupsForIncident(incident, stage);
  if (groups.length === 0) throw new Error("No active recipient groups matched this incident.");

  const notifications = [];
  for (const group of groups) {
    notifications.push(
      await deliverIncidentEmail({
        incident,
        stage,
        group,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text
      })
    );
  }

  const updates: { currentStage: IncidentStage; currentColor?: StatusColor; isOpen?: boolean; resolvedAt?: Date } = { currentStage: stage };
  if (stage === "resolved") {
    updates.currentColor = "green";
    updates.isOpen = false;
    updates.resolvedAt = new Date();
  }
  if (stage === "maintenance") updates.currentColor = "blue";

  const updatedIncident = await prisma.incident.update({ where: { id: incidentId }, data: updates });

  deliverSubscriberNotifications({
    incident: updatedIncident,
    stage,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text
  }).catch((err) => console.error("[SUBSCRIBER NOTIFY FAILED]", err));

  await auditLog({
    actorType: actor.actorType,
    actorName: actor.actorName,
    action: `incident.send_${stage}`,
    entityType: "Incident",
    entityId: incidentId,
    payload: { notificationIds: notifications.map((item) => item.id) }
  });

  return updatedIncident;
}

export async function announceIncidentStageSafely(
  incidentId: string,
  stage: IncidentStage,
  actor: { actorType: ActorType; actorName: string } = { actorType: "system", actorName: "automation" }
) {
  try {
    return await announceIncidentStage(incidentId, stage, actor);
  } catch (error) {
    await auditLog({
      actorType: actor.actorType,
      actorName: actor.actorName,
      action: `incident.send_${stage}_failed`,
      entityType: "Incident",
      entityId: incidentId,
      payload: { error: error instanceof Error ? error.message : "Unknown notification error" }
    });
    return null;
  }
}

export async function changeIncidentColor(incidentId: string, color: StatusColor) {
  const incident = await prisma.incident.update({
    where: { id: incidentId },
    data:
      color === "green"
        ? { currentColor: color, currentStage: "resolved", isOpen: false, resolvedAt: new Date() }
        : { currentColor: color }
  });
  await auditLog({
    actorType: "user",
    actorName: "operator",
    action: "incident.status_color_changed",
    entityType: "Incident",
    entityId: incident.id,
    payload: { color }
  });
  return incident;
}

export async function statusSummary() {
  const applications = await prisma.application.findMany({
    where: { isActive: true },
    include: {
      incidents: {
        where: { isOpen: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: { incidentType: true }
      }
    },
    orderBy: [{ statusPageOrder: "asc" }, { name: "asc" }]
  });

  return applications.map((app) => {
    const incident = app.incidents[0];
    return {
      app,
      color: incident?.currentColor ?? app.defaultStatus,
      message: incident ? incident.summary : "Operational",
      updatedAt: incident?.updatedAt ?? app.updatedAt,
      incident
    };
  });
}
