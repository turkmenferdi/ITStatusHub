import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { statusPatchSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const input = statusPatchSchema.parse(await request.json());
  const incident = await prisma.incident.findFirst({ where: { applicationId: appId, isOpen: true }, orderBy: { updatedAt: "desc" } });
  if (incident) {
    const updated = await prisma.incident.update({ where: { id: incident.id }, data: { currentColor: input.color, summary: input.message ?? incident.summary } });
    await auditLog({ actorType: "user", actorName: "operator", action: "status_page.manual_override", entityType: "Incident", entityId: updated.id, payload: input });
    return NextResponse.json({ incident: updated });
  }
  const app = await prisma.application.update({ where: { id: appId }, data: { defaultStatus: input.color } });
  await auditLog({ actorType: "user", actorName: "operator", action: "status_page.default_color_changed", entityType: "Application", entityId: app.id, payload: input });
  return NextResponse.json({ application: app });
}
