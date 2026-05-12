import { GroupType, IncidentStage, StatusColor } from "@prisma/client";
import { z } from "zod";

export const statusColorSchema = z.nativeEnum(StatusColor);
export const stageSchema = z.nativeEnum(IncidentStage);

export const applicationInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(40).regex(/^[A-Z0-9_-]+$/i, "Use letters, numbers, underscore, or dash"),
  ownerTeam: z.string().trim().min(2).max(120),
  statusPageLabel: z.string().trim().min(2).max(120),
  defaultStatus: statusColorSchema.default("green"),
  isActive: z.coerce.boolean().default(true)
});

export const applicationDependencyInputSchema = z
  .object({
    upstreamApplicationId: z.string().cuid(),
    downstreamApplicationId: z.string().cuid(),
    moduleName: z.string().trim().min(2, "Module name is required.").max(120),
    integrationName: z.string().trim().min(2, "Integration name is required.").max(160),
    impactDescription: z.string().trim().min(8, "Impact summary is required.").max(500),
    impactLevel: statusColorSchema.default("yellow"),
    isActive: z.coerce.boolean().default(true)
  })
  .refine((value) => value.upstreamApplicationId !== value.downstreamApplicationId, {
    message: "A service cannot depend on itself.",
    path: ["downstreamApplicationId"]
  });

export const groupInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2).max(500),
  groupType: z.nativeEnum(GroupType),
  isActive: z.coerce.boolean().default(true)
});

export const groupMemberInputSchema = z.object({
  notificationGroupId: z.string().cuid(),
  email: z.string().trim().email(),
  displayName: z.string().trim().min(2).max(120),
  isActive: z.coerce.boolean().default(true)
});

export const incidentTypeInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  severityLevel: z.coerce.number().int().min(1).max(5),
  defaultColor: statusColorSchema,
  notifyTechnical: z.coerce.boolean().default(true),
  notifyBusiness: z.coerce.boolean().default(true),
  notifyExecutive: z.coerce.boolean().default(false),
  isMaintenance: z.coerce.boolean().default(false)
});

export const templateInputSchema = z.object({
  applicationId: z.string().cuid().optional().or(z.literal("")),
  incidentTypeId: z.string().cuid().optional().or(z.literal("")),
  stage: stageSchema,
  subjectTemplate: z.string().trim().min(4, "Subject must contain at least 4 characters.").max(300),
  bodyHtmlTemplate: z.string().trim().min(1, "HTML body is required.").max(10000),
  bodyTextTemplate: z.string().trim().min(1, "Text body is required.").max(10000),
  isDefault: z.coerce.boolean().default(false)
});

export const manualIncidentInputSchema = z.object({
  applicationId: z.string().cuid(),
  scenario: z.enum(["outage", "performance", "maintenance"]),
  impact: statusColorSchema,
  summary: z.string().trim().max(1000).optional(),
  nextUpdateMinutes: z.coerce.number().int().min(5).max(240).default(30)
});

export const statusPatchSchema = z.object({
  color: statusColorSchema,
  message: z.string().trim().max(1000).optional()
});

export const renderPreviewSchema = z.object({
  template: z.string().min(1).max(10000),
  values: z.record(z.string()).default({})
});

export const xurrentWebhookSchema = z.object({
  event_id: z.string().optional(),
  id: z.string().optional(),
  event_type: z.string().optional().default("request.updated"),
  request: z
    .object({
      id: z.union([z.string(), z.number()]).transform(String),
      subject: z.string().optional(),
      service: z.string().optional(),
      service_instance: z.string().optional(),
      priority: z.string().optional(),
      status: z.string().optional(),
      state: z.string().optional(),
      major_incident_status: z.string().optional(),
      environment: z.string().optional(),
      summary: z.string().optional(),
      approved: z.boolean().optional(),
      working_teams: z.string().optional(),
      next_update_at: z.string().datetime().optional(),
      resolved_at: z.string().datetime().optional(),
      completed_at: z.string().datetime().optional(),
      closed_at: z.string().datetime().optional()
    })
    .passthrough()
}).passthrough();

export const datadogWebhookSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional().transform((value) => (value == null ? undefined : String(value))),
    event_id: z.union([z.string(), z.number()]).optional().transform((value) => (value == null ? undefined : String(value))),
    alert_id: z.union([z.string(), z.number()]).optional().transform((value) => (value == null ? undefined : String(value))),
    monitor_id: z.union([z.string(), z.number()]).optional().transform((value) => (value == null ? undefined : String(value))),
    title: z.string().optional(),
    alert_title: z.string().optional(),
    message: z.string().optional(),
    body: z.string().optional(),
    text: z.string().optional(),
    alert_status: z.string().optional(),
    alert_transition: z.string().optional(),
    priority: z.string().optional(),
    severity: z.string().optional(),
    service: z.string().optional(),
    app: z.string().optional(),
    application: z.string().optional(),
    environment: z.string().optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    date: z.union([z.string(), z.number()]).optional()
  })
  .passthrough();
