import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { eventIdFromPayload, isApprovedMajorIncident, isProductionIncident, isResolvedMajorIncident, mapIncidentType, statusForXurrentPriority, suggestApplication, xurrentServiceName } from "@/lib/xurrent-mapping";
import { xurrentWebhookSchema } from "@/lib/validation";

export async function processXurrentWebhook(rawPayload: unknown, signature?: string | null) {
  const payload = xurrentWebhookSchema.parse(rawPayload);
  const externalEventId = eventIdFromPayload(payload);

  let event = await prisma.webhookEvent.findUnique({
    where: { source_externalEventId: { source: "xurrent", externalEventId } }
  });

  if (event?.processed) {
    await auditLog({
      actorType: "webhook",
      actorName: "xurrent",
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
        source: "xurrent",
        externalEventId,
        eventType: payload.event_type,
        payloadJson: rawPayload as Prisma.InputJsonValue,
        signature
      }
    });
  }

  try {
    if (isResolvedMajorIncident(payload)) {
      const existingOpen = await prisma.incident.findFirst({
        where: { xurrentRequestId: payload.request.id, isOpen: true }
      });
      const incident = existingOpen
        ? await prisma.incident.update({
            where: { id: existingOpen.id },
            data: {
              xurrentMajorIncidentStatus: payload.request.major_incident_status ?? payload.request.status ?? "resolved",
              currentStage: "resolved",
              currentColor: "green",
              isOpen: false,
              resolvedAt: new Date(),
              summary: payload.request.summary ?? existingOpen.summary
            }
          })
        : null;

      const processed = await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processed: true, processedAt: new Date() }
      });

      await auditLog({
        actorType: "webhook",
        actorName: "xurrent",
        action: incident ? "incident.resolution_received_from_webhook" : "webhook.resolved_without_open_incident",
        entityType: incident ? "Incident" : "WebhookEvent",
        entityId: incident?.id ?? event.id,
        payload: { webhookEventId: event.id, requestId: payload.request.id, approvalRequired: Boolean(incident), nextAction: "review_resolved_notification" }
      });

      return { event: processed, duplicate: false, incident };
    }

    if (!isApprovedMajorIncident(payload)) {
      const processed = await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processed: true, processedAt: new Date() }
      });
      await auditLog({
        actorType: "webhook",
        actorName: "xurrent",
        action: "webhook.non_major_incident_ignored",
        entityType: "WebhookEvent",
        entityId: event.id,
        payload: { requestId: payload.request.id }
      });
      return { event: processed, duplicate: false, incident: null };
    }

    const [suggestedApplication, incidentType] = await Promise.all([suggestApplication(payload), mapIncidentType(payload)]);
    const title = payload.request.subject ?? `Xurrent request ${payload.request.id}`;
    const summary = payload.request.summary ?? "Approved major incident received from Xurrent.";
    const existingOpen = await prisma.incident.findFirst({ where: { xurrentRequestId: payload.request.id, isOpen: true } });

    if (existingOpen) {
      const mappedColor = statusForXurrentPriority(payload, incidentType);
      const updatedIncident = await prisma.incident.update({
        where: { id: existingOpen.id },
        data: {
          xurrentMajorIncidentStatus: payload.request.major_incident_status ?? "approved",
          incidentTypeId: incidentType.id,
          currentStage: incidentType.isMaintenance ? "maintenance" : "update",
          currentColor: mappedColor,
          title,
          summary,
          workingTeams: payload.request.working_teams ?? existingOpen.workingTeams,
          nextUpdateAt: payload.request.next_update_at ? new Date(payload.request.next_update_at) : null
        }
      });

      const processed = await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processed: true, processedAt: new Date() }
      });

      await auditLog({
        actorType: "webhook",
        actorName: "xurrent",
        action: "incident.updated_from_webhook",
        entityType: "Incident",
        entityId: updatedIncident.id,
        payload: {
          webhookEventId: event.id,
          incidentType: incidentType.name,
          approvalRequired: true,
          nextAction: "review_update_notification"
        }
      });

      return { event: processed, duplicate: false, incident: updatedIncident };
    }

    const intake = await prisma.pendingIncidentIntake.upsert({
      where: {
        source_externalRequestId_status: {
          source: "xurrent",
          externalRequestId: payload.request.id,
          status: "pending"
        }
      },
      update: {
        externalEventId,
        externalServiceName: xurrentServiceName(payload),
        suggestedApplicationId: suggestedApplication?.id,
        incidentTypeId: incidentType.id,
        title,
        summary,
        priority: payload.request.priority,
        majorIncidentStatus: payload.request.major_incident_status ?? "approved",
        workingTeams: payload.request.working_teams ?? suggestedApplication?.ownerTeam,
        nextUpdateAt: payload.request.next_update_at ? new Date(payload.request.next_update_at) : null,
        payloadJson: rawPayload as Prisma.InputJsonValue
      },
      create: {
        source: "xurrent",
        externalRequestId: payload.request.id,
        externalEventId,
        externalServiceName: xurrentServiceName(payload),
        suggestedApplicationId: suggestedApplication?.id,
        incidentTypeId: incidentType.id,
        title,
        summary,
        priority: payload.request.priority,
        majorIncidentStatus: payload.request.major_incident_status ?? "approved",
        workingTeams: payload.request.working_teams ?? suggestedApplication?.ownerTeam,
        nextUpdateAt: payload.request.next_update_at ? new Date(payload.request.next_update_at) : null,
        payloadJson: rawPayload as Prisma.InputJsonValue
      }
    });

    const processed = await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { processed: true, processedAt: new Date() }
    });

    await auditLog({
      actorType: "webhook",
      actorName: "xurrent",
      action: "intake.pending_from_webhook",
      entityType: "PendingIncidentIntake",
      entityId: intake.id,
      payload: {
        webhookEventId: event.id,
        production: isProductionIncident(payload),
        suggestedApplication: suggestedApplication?.code ?? null,
        externalServiceName: intake.externalServiceName,
        incidentType: incidentType.name,
        approvalRequired: true,
        nextAction: "approve_major_incident_intake"
      }
    });

    return { event: processed, duplicate: false, incident: null, intake };
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { processingError: error instanceof Error ? error.message : "Unknown processing error" }
    });
    throw error;
  }
}
