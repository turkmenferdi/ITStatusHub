import type { ActorType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function auditLog(input: {
  actorType: ActorType;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  payload?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
    data: {
      actorType: input.actorType,
      actorName: input.actorName,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      payloadJson: input.payload ?? {}
    }
  });
}
