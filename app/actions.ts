"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { createSession, requireRole } from "@/lib/auth";
import { applicationDependencyInputSchema, applicationInputSchema, groupInputSchema, groupMemberInputSchema, incidentTypeInputSchema, manualIncidentInputSchema, statusColorSchema, templateInputSchema, xurrentWebhookSchema } from "@/lib/validation";
import { announceIncidentStage, changeIncidentColor, sendIncidentStage } from "@/lib/incidents";
import { processXurrentWebhook } from "@/lib/webhook-processing";
import { deliverTemplateTestEmail } from "@/lib/email";
import { renderTemplate } from "@/lib/template";
import { messageBlueprints } from "@/lib/message-blueprints";
import { checkRateLimit } from "@/lib/rate-limit";
import { statusForXurrentPriority } from "@/lib/xurrent-mapping";
import { syncXurrentServiceCatalog } from "@/lib/xurrent-service-sync";

function boolFromForm(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function redirectWithFormError(path: string, error: unknown) {
  if (error instanceof z.ZodError) {
    const message = error.issues.map((issue) => `${issue.path.join(".") || "field"}: ${issue.message}`).join(" ");
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") redirect(`${path}?error=${encodeURIComponent("A record with the same unique value already exists.")}`);
    if (error.code === "P2003") redirect(`${path}?error=${encodeURIComponent("The selected related record is not valid anymore. Refresh the page and try again.")}`);
  }

  const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const loginLimit = checkRateLimit(`login:${username.toLowerCase()}`, 8, 10 * 60 * 1000);
  if (!loginLimit.allowed) redirect("/login?error=rate-limit");

  const headerStore = await headers();
  if (await createSession(username, password, {
    userAgent: headerStore.get("user-agent"),
    ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip")
  })) redirect("/dashboard");
  redirect("/login?error=1");
}

export async function createApplicationAction(formData: FormData) {
  try {
    const maxOrder = await prisma.application.aggregate({ _max: { statusPageOrder: true } });
    const input = applicationInputSchema.parse({
      name: formData.get("name"),
      code: formData.get("code"),
      ownerTeam: formData.get("ownerTeam"),
      statusPageLabel: formData.get("statusPageLabel"),
      defaultStatus: formData.get("defaultStatus"),
      isActive: boolFromForm(formData.get("isActive"))
    });
    const app = await prisma.application.create({ data: { ...input, statusPageOrder: (maxOrder._max.statusPageOrder ?? 0) + 10 } });
    await auditLog({ actorType: "user", actorName: "operator", action: "application.created", entityType: "Application", entityId: app.id, payload: input });
  } catch (error) {
    redirectWithFormError("/applications", error);
  }
  revalidatePath("/applications");
  redirect("/applications?created=application");
}

export async function updateStatusPageOrderAction(formData: FormData) {
  try {
    const orderedIds = String(formData.get("orderedIds") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (!orderedIds.length) throw new Error("No service order was provided.");
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.application.update({
          where: { id },
          data: { statusPageOrder: (index + 1) * 10 }
        })
      )
    );
    await auditLog({
      actorType: "user",
      actorName: "operator",
      action: "status_page.order_updated",
      entityType: "Application",
      entityId: "status-page-order",
      payload: { orderedIds }
    });
  } catch (error) {
    redirectWithFormError("/applications", error);
  }
  revalidatePath("/applications");
  revalidatePath("/status-page");
  revalidatePath("/status-page/public");
  redirect("/applications?created=order");
}

export async function createApplicationDependencyAction(formData: FormData) {
  try {
    const input = applicationDependencyInputSchema.parse({
      upstreamApplicationId: formData.get("upstreamApplicationId"),
      downstreamApplicationId: formData.get("downstreamApplicationId"),
      moduleName: formData.get("moduleName"),
      integrationName: formData.get("integrationName"),
      impactDescription: formData.get("impactDescription"),
      impactLevel: formData.get("impactLevel"),
      isActive: true
    });
    const dependency = await prisma.applicationDependency.upsert({
      where: {
        upstreamApplicationId_downstreamApplicationId_moduleName_integrationName: {
          upstreamApplicationId: input.upstreamApplicationId,
          downstreamApplicationId: input.downstreamApplicationId,
          moduleName: input.moduleName,
          integrationName: input.integrationName
        }
      },
      update: {
        impactDescription: input.impactDescription,
        impactLevel: input.impactLevel,
        isActive: true
      },
      create: input
    });
    await auditLog({ actorType: "user", actorName: "operator", action: "application_dependency.upserted", entityType: "ApplicationDependency", entityId: dependency.id, payload: input });
  } catch (error) {
    redirectWithFormError("/applications", error);
  }
  revalidatePath("/applications");
  revalidatePath("/status-page");
  revalidatePath("/status-page/public");
  redirect("/applications?created=dependency");
}

export async function deactivateApplicationDependencyAction(formData: FormData) {
  const dependencyId = String(formData.get("dependencyId") ?? "");
  try {
    const dependency = await prisma.applicationDependency.update({ where: { id: dependencyId }, data: { isActive: false } });
    await auditLog({
      actorType: "user",
      actorName: "operator",
      action: "application_dependency.deactivated",
      entityType: "ApplicationDependency",
      entityId: dependency.id,
      payload: { dependencyId }
    });
  } catch (error) {
    redirectWithFormError("/applications", error);
  }
  revalidatePath("/applications");
  revalidatePath("/status-page");
  revalidatePath("/status-page/public");
  redirect("/applications?created=dependency-removed");
}

export async function createGroupAction(formData: FormData) {
  try {
    const input = groupInputSchema.parse({
      name: formData.get("name"),
      description: formData.get("description"),
      groupType: formData.get("groupType"),
      isActive: boolFromForm(formData.get("isActive"))
    });
    const group = await prisma.notificationGroup.create({ data: input });
    await auditLog({ actorType: "user", actorName: "operator", action: "group.created", entityType: "NotificationGroup", entityId: group.id, payload: input });
  } catch (error) {
    redirectWithFormError("/groups", error);
  }
  revalidatePath("/groups");
  redirect("/groups?created=group");
}

export async function addGroupMemberAction(formData: FormData) {
  try {
    const input = groupMemberInputSchema.parse({
      notificationGroupId: formData.get("notificationGroupId"),
      email: formData.get("email"),
      displayName: formData.get("displayName"),
      isActive: true
    });
    const member = await prisma.notificationGroupMember.create({ data: input });
    await auditLog({ actorType: "user", actorName: "operator", action: "group.member_added", entityType: "NotificationGroupMember", entityId: member.id, payload: input });
  } catch (error) {
    redirectWithFormError("/groups", error);
  }
  revalidatePath("/groups");
  redirect("/groups?created=member");
}

export async function createIncidentTypeAction(formData: FormData) {
  try {
    const input = incidentTypeInputSchema.parse({
      name: formData.get("name"),
      severityLevel: formData.get("severityLevel"),
      defaultColor: formData.get("defaultColor"),
      notifyTechnical: boolFromForm(formData.get("notifyTechnical")),
      notifyBusiness: boolFromForm(formData.get("notifyBusiness")),
      notifyExecutive: boolFromForm(formData.get("notifyExecutive")),
      isMaintenance: boolFromForm(formData.get("isMaintenance"))
    });
    const type = await prisma.incidentType.create({ data: input });
    await auditLog({ actorType: "user", actorName: "operator", action: "incident_type.created", entityType: "IncidentType", entityId: type.id, payload: input });
  } catch (error) {
    redirectWithFormError("/incident-types", error);
  }
  revalidatePath("/incident-types");
  redirect("/incident-types?created=type");
}

export async function createTemplateAction(formData: FormData) {
  try {
    const stage = String(formData.get("stage") ?? "update") as keyof typeof messageBlueprints;
    const blueprint = messageBlueprints[stage] ?? messageBlueprints.update;
    const input = templateInputSchema.parse({
      applicationId: formData.get("applicationId"),
      incidentTypeId: formData.get("incidentTypeId"),
      stage,
      subjectTemplate: formData.get("subjectTemplate") || blueprint.subject,
      bodyHtmlTemplate: formData.get("bodyHtmlTemplate") || blueprint.html,
      bodyTextTemplate: formData.get("bodyTextTemplate") || blueprint.text,
      isDefault: boolFromForm(formData.get("isDefault"))
    });
    const template = await prisma.messageTemplate.create({
      data: {
        ...input,
        applicationId: input.applicationId || null,
        incidentTypeId: input.incidentTypeId || null
      }
    });
    await auditLog({ actorType: "user", actorName: "operator", action: "template.created", entityType: "MessageTemplate", entityId: template.id, payload: input });
  } catch (error) {
    redirectWithFormError("/templates", error);
  }

  revalidatePath("/templates");
  redirect("/templates?created=template");
}

export async function sendTemplateTestEmailAction(formData: FormData) {
  const templateId = String(formData.get("templateId") ?? "");
  const to = String(formData.get("to") ?? "").trim();
  let deliveryStatus = "simulated";
  try {
    const email = z.string().email("Enter a valid email address.").parse(to);
    const template = await prisma.messageTemplate.findUniqueOrThrow({ where: { id: templateId } });
    const rendered = renderTemplate(template, {
      app_name: "Website",
      incident_type: "Full Outage",
      title: "Checkout error rate is elevated",
      summary: "Customers are seeing elevated errors while completing checkout.",
      working_teams: "Web Platform, SRE On-Call",
      next_update_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      stage: template.stage,
      status_color: "red"
    });
    const result = await deliverTemplateTestEmail({ templateId, to: email, ...rendered });
    deliveryStatus = result.deliveryStatus;
  } catch (error) {
    redirectWithFormError("/templates", error);
  }
  redirect(`/templates?created=test-email&delivery=${deliveryStatus}`);
}

export async function sendStageAction(formData: FormData) {
  const incidentId = String(formData.get("incidentId"));
  const stage = String(formData.get("stage")) as "started" | "update" | "resolved" | "maintenance";
  await sendIncidentStage(incidentId, stage);
  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/dashboard");
}

function textToHtml(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export async function confirmStageNotificationAction(formData: FormData) {
  const incidentId = String(formData.get("incidentId") ?? "");
  const stage = String(formData.get("stage")) as "started" | "update" | "resolved" | "maintenance";
  const subject = String(formData.get("subject") ?? "").trim();
  const text = String(formData.get("bodyText") ?? "").trim();

  if (!subject || !text) {
    redirect(`/incidents/${incidentId}/compose/${stage}?error=${encodeURIComponent("Subject and message are required.")}`);
  }

  await announceIncidentStage(
    incidentId,
    stage,
    { actorType: "user", actorName: "operator" },
    { subject, text, html: textToHtml(text) }
  );

  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/incidents");
  revalidatePath("/dashboard");
  revalidatePath("/status-page");
  revalidatePath("/status-page/public");
  redirect(`/incidents/${incidentId}`);
}

const scenarioConfig = {
  outage: {
    incidentType: "Full Outage",
    title: "Service disruption in progress",
    summary: "Users are experiencing a service disruption. Our teams are working to restore normal service.",
    stage: "started" as const
  },
  performance: {
    incidentType: "Performance Issue",
    title: "Service performance issue in progress",
    summary: "Users may experience slow responses or intermittent errors. Our teams are investigating the issue.",
    stage: "started" as const
  },
  maintenance: {
    incidentType: "Planned Maintenance",
    title: "Planned maintenance started",
    summary: "Users may experience temporary disruption or degraded performance during the maintenance window.",
    stage: "maintenance" as const
  }
};

const userInputSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  role: z.enum(["admin", "operator", "viewer"]),
  password: z.string().min(12, "Temporary password must be at least 12 characters.")
});

export async function createUserAction(formData: FormData) {
  const actor = await requireRole(["admin"]);
  try {
    const input = userInputSchema.parse({
      email: formData.get("email"),
      name: formData.get("name"),
      role: formData.get("role"),
      password: formData.get("password")
    });
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        passwordHash: await bcrypt.hash(input.password, 12),
        isActive: true
      }
    });
    await auditLog({
      actorType: "user",
      actorName: actor.name,
      action: "user.created",
      entityType: "User",
      entityId: user.id,
      payload: { email: user.email, role: user.role }
    });
  } catch (error) {
    redirectWithFormError("/users", error);
  }
  revalidatePath("/users");
  redirect("/users?created=user");
}

export async function toggleUserActiveAction(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const userId = String(formData.get("userId") ?? "");
  const isActive = formData.get("isActive") === "true";
  try {
    if (actor.id === userId && !isActive) throw new Error("You cannot deactivate your own account.");
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive }
    });
    if (!isActive) await prisma.session.deleteMany({ where: { userId } });
    await auditLog({
      actorType: "user",
      actorName: actor.name,
      action: isActive ? "user.activated" : "user.deactivated",
      entityType: "User",
      entityId: user.id,
      payload: { email: user.email, role: user.role }
    });
  } catch (error) {
    redirectWithFormError("/users", error);
  }
  revalidatePath("/users");
  redirect("/users?created=user-updated");
}

export async function approvePendingIntakeAction(formData: FormData) {
  const actor = await requireRole(["admin", "operator"]);
  const intakeId = String(formData.get("intakeId") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  const createMapping = boolFromForm(formData.get("createMapping"));

  let incidentId: string | null = null;
  let composeStage: "started" | "maintenance" = "started";
  try {
    const intake = await prisma.pendingIncidentIntake.findUniqueOrThrow({
      where: { id: intakeId },
      include: { incidentType: true }
    });
    if (intake.status !== "pending") throw new Error("This intake has already been processed.");
    if (!applicationId) throw new Error("Select the StatusHub service that matches the 4me service instance.");

    const application = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const existingOpen = await prisma.incident.findFirst({
      where: { xurrentRequestId: intake.externalRequestId, isOpen: true }
    });
    if (existingOpen) throw new Error("An open incident already exists for this 4me request.");

    const parsedPayload = xurrentWebhookSchema.safeParse(intake.payloadJson);
    const production = parsedPayload.success ? !["test", "dev", "development", "staging", "non-production", "nonprod"].some((value) => (parsedPayload.data.request.environment?.toLowerCase() ?? "production").includes(value)) : true;
    const color = parsedPayload.success ? statusForXurrentPriority(parsedPayload.data, intake.incidentType) : intake.incidentType.defaultColor;
    const stage = intake.incidentType.isMaintenance ? "maintenance" : "started";
    composeStage = stage;

    const incident = await prisma.incident.create({
      data: {
        xurrentRequestId: intake.externalRequestId,
        xurrentMajorIncidentStatus: intake.majorIncidentStatus ?? "approved",
        applicationId: application.id,
        incidentTypeId: intake.incidentTypeId,
        currentStage: stage,
        currentColor: production ? color : "yellow",
        title: intake.title,
        summary: production ? intake.summary : `[NON-PRODUCTION] ${intake.summary}`,
        workingTeams: intake.workingTeams ?? application.ownerTeam,
        nextUpdateAt: intake.nextUpdateAt
      }
    });
    incidentId = incident.id;

    if (createMapping) {
      await prisma.externalServiceMapping.upsert({
        where: { source_externalServiceName: { source: intake.source, externalServiceName: intake.externalServiceName } },
        update: {
          externalServiceId: intake.externalServiceId,
          applicationId: application.id
        },
        create: {
          source: intake.source,
          externalServiceId: intake.externalServiceId,
          externalServiceName: intake.externalServiceName,
          applicationId: application.id
        }
      });
    }

    await prisma.pendingIncidentIntake.update({
      where: { id: intake.id },
      data: {
        status: "approved",
        suggestedApplicationId: application.id,
        approvedIncidentId: incident.id,
        approvedAt: new Date()
      }
    });

    await auditLog({
      actorType: "user",
      actorName: actor.name,
      action: "intake.approved",
      entityType: "PendingIncidentIntake",
      entityId: intake.id,
      payload: { incidentId: incident.id, applicationId: application.id, createMapping }
    });
  } catch (error) {
    redirectWithFormError("/automation", error);
  }

  revalidatePath("/automation");
  revalidatePath("/dashboard");
  revalidatePath("/incidents");
  revalidatePath("/status-page");
  revalidatePath("/status-page/public");
  redirect(incidentId ? `/incidents/${incidentId}/compose/${composeStage}` : "/automation");
}

export async function ignorePendingIntakeAction(formData: FormData) {
  const actor = await requireRole(["admin", "operator"]);
  const intakeId = String(formData.get("intakeId") ?? "");
  try {
    const intake = await prisma.pendingIncidentIntake.update({
      where: { id: intakeId },
      data: { status: "ignored", ignoredAt: new Date() }
    });
    await auditLog({
      actorType: "user",
      actorName: actor.name,
      action: "intake.ignored",
      entityType: "PendingIncidentIntake",
      entityId: intake.id,
      payload: { externalRequestId: intake.externalRequestId }
    });
  } catch (error) {
    redirectWithFormError("/automation", error);
  }
  revalidatePath("/automation");
  revalidatePath("/dashboard");
  redirect("/automation?created=intake-ignored");
}

export async function syncXurrentServicesAction() {
  const actor = await requireRole(["admin"]);
  try {
    const result = await syncXurrentServiceCatalog();
    await auditLog({
      actorType: "user",
      actorName: actor.name,
      action: "xurrent.service_catalog_synced",
      entityType: "ExternalServiceCatalogItem",
      entityId: "xurrent-service-sync",
      payload: result
    });
  } catch (error) {
    redirectWithFormError("/automation", error);
  }
  revalidatePath("/automation");
  redirect("/automation?created=service-sync");
}

export async function mapCatalogServiceAction(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const catalogItemId = String(formData.get("catalogItemId") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  try {
    if (!applicationId) throw new Error("Select a StatusHub service to save the mapping.");
    const catalogItem = await prisma.externalServiceCatalogItem.findUniqueOrThrow({ where: { id: catalogItemId } });
    await prisma.externalServiceCatalogItem.update({
      where: { id: catalogItemId },
      data: { suggestedApplicationId: applicationId, lastSyncedAt: new Date() }
    });
    await prisma.externalServiceMapping.upsert({
      where: { source_externalServiceName: { source: catalogItem.source, externalServiceName: catalogItem.externalServiceName } },
      update: {
        externalServiceId: catalogItem.externalServiceId,
        applicationId
      },
      create: {
        source: catalogItem.source,
        externalServiceId: catalogItem.externalServiceId,
        externalServiceName: catalogItem.externalServiceName,
        applicationId
      }
    });
    await auditLog({
      actorType: "user",
      actorName: actor.name,
      action: "xurrent.service_catalog_mapped",
      entityType: "ExternalServiceCatalogItem",
      entityId: catalogItem.id,
      payload: { applicationId }
    });
  } catch (error) {
    redirectWithFormError("/automation", error);
  }
  revalidatePath("/automation");
  redirect("/automation?created=service-mapped");
}

async function incidentTypeForScenario(scenario: keyof typeof scenarioConfig, fallbackColor: "green" | "yellow" | "red" | "blue") {
  const config = scenarioConfig[scenario];
  const existing = await prisma.incidentType.findUnique({ where: { name: config.incidentType } });
  if (existing) return existing;

  return prisma.incidentType.create({
    data: {
      name: config.incidentType,
      severityLevel: scenario === "outage" ? 1 : scenario === "performance" ? 2 : 3,
      defaultColor: scenario === "maintenance" ? "blue" : fallbackColor,
      notifyTechnical: true,
      notifyBusiness: scenario !== "maintenance",
      notifyExecutive: scenario === "outage",
      isMaintenance: scenario === "maintenance"
    }
  });
}

export async function createManualIncidentAction(formData: FormData) {
  let incidentId: string | null = null;
  let composeStage: "started" | "maintenance" = "started";
  try {
    const input = manualIncidentInputSchema.parse({
      applicationId: formData.get("applicationId"),
      scenario: formData.get("scenario"),
      impact: formData.get("impact"),
      summary: formData.get("summary"),
      nextUpdateMinutes: formData.get("nextUpdateMinutes")
    });

    const application = await prisma.application.findUniqueOrThrow({ where: { id: input.applicationId } });

    const existingOpen = await prisma.incident.findFirst({
      where: { applicationId: input.applicationId, isOpen: true }
    });
    if (existingOpen) {
      redirect(`/incidents/${existingOpen.id}?error=${encodeURIComponent("This service already has an open incident. Resolve it before declaring a new one.")}`);
    }

    const config = scenarioConfig[input.scenario];
    const incidentType = await incidentTypeForScenario(input.scenario, input.impact);
    const summary = input.summary?.trim() || config.summary;
    const stage = input.scenario === "maintenance" || input.impact === "blue" ? "maintenance" : config.stage;
    composeStage = stage;
    const incident = await prisma.incident.create({
      data: {
        xurrentRequestId: `MANUAL-${Date.now()}`,
        xurrentMajorIncidentStatus: "manual",
        applicationId: application.id,
        incidentTypeId: incidentType.id,
        currentStage: stage,
        currentColor: input.scenario === "maintenance" ? "blue" : input.impact,
        title: `${application.statusPageLabel}: ${config.title}`,
        summary,
        workingTeams: application.ownerTeam,
        nextUpdateAt: new Date(Date.now() + input.nextUpdateMinutes * 60 * 1000)
      }
    });
    incidentId = incident.id;

    await auditLog({
      actorType: "user",
      actorName: "operator",
      action: "incident.created_manually",
      entityType: "Incident",
      entityId: incident.id,
      payload: { scenario: input.scenario, impact: input.impact }
    });

  } catch (error) {
    redirectWithFormError("/incidents", error);
  }

  revalidatePath("/incidents");
  revalidatePath("/dashboard");
  revalidatePath("/status-page");
  revalidatePath("/status-page/public");
  redirect(incidentId ? `/incidents/${incidentId}/compose/${composeStage}` : "/incidents");
}

export async function changeIncidentColorAction(formData: FormData) {
  const incidentId = String(formData.get("incidentId"));
  const color = statusColorSchema.parse(formData.get("color"));
  await changeIncidentColor(incidentId, color);
  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/incidents");
  revalidatePath("/dashboard");
  revalidatePath("/status-page");
  revalidatePath("/status-page/public");
}

export async function addManualNoteAction(formData: FormData) {
  const incidentId = String(formData.get("incidentId"));
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return;
  await auditLog({ actorType: "user", actorName: "operator", action: "incident.manual_note", entityType: "Incident", entityId: incidentId, payload: { note } });
  revalidatePath(`/incidents/${incidentId}`);
}

export async function savePostMortemAction(formData: FormData) {
  const incidentId         = String(formData.get("incidentId") ?? "");
  const severity           = String(formData.get("severity") ?? "").trim() || null;
  const impact             = String(formData.get("impact") ?? "").trim() || null;
  const timeline           = String(formData.get("timeline") ?? "").trim() || null;
  const rootCause          = String(formData.get("rootCause") ?? "").trim() || null;
  const contributingFactors = String(formData.get("contributingFactors") ?? "").trim() || null;
  const lessonsLearned     = String(formData.get("lessonsLearned") ?? "").trim() || null;
  const actionItems        = String(formData.get("actionItems") ?? "").trim() || null;
  const authorName         = String(formData.get("authorName") ?? "").trim() || null;

  try {
    await prisma.postMortem.upsert({
      where:  { incidentId },
      update: { severity, impact, timeline, rootCause, contributingFactors, lessonsLearned, actionItems, authorName },
      create: { incidentId, severity, impact, timeline, rootCause, contributingFactors, lessonsLearned, actionItems, authorName }
    });
    await auditLog({
      actorType: "user", actorName: authorName ?? "operator",
      action: "postmortem.saved", entityType: "Incident", entityId: incidentId,
      payload: { authorName, severity }
    });
  } catch (error) {
    redirectWithFormError(`/incidents/${incidentId}/postmortem`, error);
  }
  revalidatePath(`/incidents/${incidentId}/postmortem`);
  revalidatePath(`/incidents/${incidentId}`);
  redirect(`/incidents/${incidentId}/postmortem?saved=1`);
}

export async function removeGroupMemberAction(formData: FormData) {
  const memberId = String(formData.get("memberId") ?? "");
  try {
    const member = await prisma.notificationGroupMember.delete({ where: { id: memberId } });
    await auditLog({ actorType: "user", actorName: "operator", action: "group.member_removed", entityType: "NotificationGroupMember", entityId: memberId, payload: { email: member.email } });
  } catch (error) {
    redirectWithFormError("/groups", error);
  }
  revalidatePath("/groups");
  redirect("/groups?created=member-removed");
}

export async function deleteGroupAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  try {
    const group = await prisma.notificationGroup.delete({ where: { id: groupId } });
    await auditLog({ actorType: "user", actorName: "operator", action: "group.deleted", entityType: "NotificationGroup", entityId: groupId, payload: { name: group.name } });
  } catch (error) {
    redirectWithFormError("/groups", error);
  }
  revalidatePath("/groups");
  redirect("/groups?created=group-deleted");
}

export async function toggleGroupActiveAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const isActive = formData.get("isActive") === "true";
  try {
    const group = await prisma.notificationGroup.update({ where: { id: groupId }, data: { isActive } });
    await auditLog({ actorType: "user", actorName: "operator", action: "group.toggled", entityType: "NotificationGroup", entityId: groupId, payload: { isActive: group.isActive } });
  } catch (error) {
    redirectWithFormError("/groups", error);
  }
  revalidatePath("/groups");
  redirect("/groups?created=group-toggled");
}

export async function deleteIncidentTypeAction(formData: FormData) {
  const typeId = String(formData.get("typeId") ?? "");
  try {
    const type = await prisma.incidentType.delete({ where: { id: typeId } });
    await auditLog({ actorType: "user", actorName: "operator", action: "incident_type.deleted", entityType: "IncidentType", entityId: typeId, payload: { name: type.name } });
  } catch (error) {
    redirectWithFormError("/incident-types", error);
  }
  revalidatePath("/incident-types");
  redirect("/incident-types?created=type-deleted");
}

export async function updateApplicationAction(formData: FormData) {
  const appId = String(formData.get("appId") ?? "");
  try {
    const input = applicationInputSchema.parse({
      name: formData.get("name"),
      code: formData.get("code"),
      ownerTeam: formData.get("ownerTeam"),
      statusPageLabel: formData.get("statusPageLabel"),
      defaultStatus: formData.get("defaultStatus"),
      isActive: boolFromForm(formData.get("isActive"))
    });
    const app = await prisma.application.update({ where: { id: appId }, data: input });
    await auditLog({ actorType: "user", actorName: "operator", action: "application.updated", entityType: "Application", entityId: app.id, payload: input });
  } catch (error) {
    redirectWithFormError("/applications", error);
  }
  revalidatePath("/applications");
  redirect("/applications?created=application-updated");
}

export async function deleteApplicationAction(formData: FormData) {
  const appId = String(formData.get("appId") ?? "");
  try {
    const app = await prisma.application.delete({ where: { id: appId } });
    await auditLog({ actorType: "user", actorName: "operator", action: "application.deleted", entityType: "Application", entityId: appId, payload: { name: app.name } });
  } catch (error) {
    redirectWithFormError("/applications", error);
  }
  revalidatePath("/applications");
  revalidatePath("/status-page");
  revalidatePath("/status-page/public");
  redirect("/applications?created=application-deleted");
}

export async function upsertRoutingRuleAction(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  const incidentTypeId = String(formData.get("incidentTypeId") ?? "");
  const technicalGroupId = String(formData.get("technicalGroupId") ?? "") || null;
  const businessGroupId = String(formData.get("businessGroupId") ?? "") || null;
  const executiveGroupId = String(formData.get("executiveGroupId") ?? "") || null;
  const maintenanceGroupId = String(formData.get("maintenanceGroupId") ?? "") || null;

  try {
    if (!applicationId || !incidentTypeId) throw new Error("Application and incident type are required.");
    const rule = await prisma.applicationGroupRule.upsert({
      where: { applicationId_incidentTypeId: { applicationId, incidentTypeId } },
      update: { technicalGroupId, businessGroupId, executiveGroupId, maintenanceGroupId },
      create: { applicationId, incidentTypeId, technicalGroupId, businessGroupId, executiveGroupId, maintenanceGroupId }
    });
    await auditLog({ actorType: "user", actorName: "operator", action: "routing_rule.upserted", entityType: "ApplicationGroupRule", entityId: rule.id, payload: { applicationId, incidentTypeId } });
  } catch (error) {
    redirectWithFormError("/routing-rules", error);
  }
  revalidatePath("/routing-rules");
  redirect("/routing-rules?created=rule");
}

export async function deleteRoutingRuleAction(formData: FormData) {
  const ruleId = String(formData.get("ruleId") ?? "");
  try {
    await prisma.applicationGroupRule.delete({ where: { id: ruleId } });
    await auditLog({ actorType: "user", actorName: "operator", action: "routing_rule.deleted", entityType: "ApplicationGroupRule", entityId: ruleId, payload: {} });
  } catch (error) {
    redirectWithFormError("/routing-rules", error);
  }
  revalidatePath("/routing-rules");
  redirect("/routing-rules?created=rule-deleted");
}

export async function publishPostMortemAction(formData: FormData) {
  const incidentId = String(formData.get("incidentId") ?? "");
  try {
    await prisma.postMortem.update({
      where: { incidentId },
      data: { publishedAt: new Date() }
    });
    await auditLog({ actorType: "user", actorName: "operator", action: "postmortem.published", entityType: "Incident", entityId: incidentId, payload: {} });
  } catch (error) {
    redirectWithFormError(`/incidents/${incidentId}/postmortem`, error);
  }
  revalidatePath(`/incidents/${incidentId}/postmortem`);
  redirect(`/incidents/${incidentId}/postmortem?published=1`);
}

export async function simulateXurrentIncidentAction() {
  const now = Date.now();
  const result = await processXurrentWebhook(
    {
      event_id: `dashboard-dev-${now}`,
      event_type: "request.updated",
      request: {
        id: `REQ-${now}`,
        subject: "Website checkout errors",
        service: "Website",
        priority: "P1",
        major_incident_status: "approved",
        environment: "production",
        summary: "Customers are seeing elevated errors while completing checkout.",
        approved: true,
        working_teams: "SRE On-Call, Backend",
        next_update_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      }
    },
    "dashboard-simulator"
  );

  revalidatePath("/dashboard");
  revalidatePath("/incidents");
  revalidatePath("/status-page");

  if (result.incident) redirect(`/incidents/${result.incident.id}`);
  redirect("/incidents");
}
