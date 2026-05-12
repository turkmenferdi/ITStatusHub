import type { MessageTemplate } from "@prisma/client";
import type { TemplateContext } from "@/types/incidents";
import { prisma } from "@/lib/prisma";

const tokenPattern = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

export function renderString(template: string, context: Record<string, string | number | null | undefined>) {
  return template.replace(tokenPattern, (_, key: string) => String(context[key] ?? ""));
}

export function renderTemplate(template: MessageTemplate, context: TemplateContext) {
  return {
    subject: renderString(template.subjectTemplate, context),
    html: renderString(template.bodyHtmlTemplate, context),
    text: renderString(template.bodyTextTemplate, context)
  };
}

export async function findBestTemplate(input: {
  applicationId: string;
  incidentTypeId: string;
  stage: MessageTemplate["stage"];
}) {
  const candidates = await prisma.messageTemplate.findMany({
    where: {
      stage: input.stage,
      OR: [
        { applicationId: input.applicationId, incidentTypeId: input.incidentTypeId },
        { applicationId: input.applicationId, incidentTypeId: null },
        { applicationId: null, incidentTypeId: input.incidentTypeId },
        { isDefault: true }
      ]
    },
    orderBy: { createdAt: "desc" }
  });

  return candidates.sort((a, b) => templateScore(b, input) - templateScore(a, input))[0] ?? null;
}

function templateScore(template: MessageTemplate, input: { applicationId: string; incidentTypeId: string }) {
  let score = 0;
  if (template.applicationId === input.applicationId) score += 4;
  if (template.incidentTypeId === input.incidentTypeId) score += 2;
  if (template.isDefault) score += 1;
  return score;
}
