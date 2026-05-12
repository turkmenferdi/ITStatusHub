import { Prisma } from "@prisma/client";
import { z } from "zod";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const xurrentServiceInstanceSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().nullish(),
  display_name: z.string().nullish(),
  service_instance: z.object({
    id: z.union([z.string(), z.number()]).nullish(),
    name: z.string().nullish()
  }).nullish(),
  service: z.object({
    id: z.union([z.string(), z.number()]).nullish(),
    name: z.string().nullish()
  }).nullish(),
  support_team: z.object({
    id: z.union([z.string(), z.number()]).nullish(),
    name: z.string().nullish()
  }).nullish(),
  status: z.string().nullish(),
  environment: z.string().nullish()
});

type XurrentServiceInstance = z.infer<typeof xurrentServiceInstanceSchema>;

function textIncludes(source: string, candidates: string[]) {
  const haystack = source.toLowerCase();
  return candidates.some((candidate) => haystack.includes(candidate.toLowerCase()));
}

function normalizeBaseUrl() {
  return env.XURRENT_API_BASE_URL.replace(/\/$/, "");
}

function xurrentHeaders() {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.XURRENT_API_TOKEN}`,
    Accept: "application/json"
  };
  if (env.XURRENT_ACCOUNT_ID) headers["X-Xurrent-Account"] = env.XURRENT_ACCOUNT_ID;
  return headers;
}

function extractItems(payload: unknown): XurrentServiceInstance[] {
  if (Array.isArray(payload)) return payload.map((item) => xurrentServiceInstanceSchema.parse(item));
  if (payload && typeof payload === "object") {
    const objectPayload = payload as Record<string, unknown>;
    if (Array.isArray(objectPayload.data)) return objectPayload.data.map((item) => xurrentServiceInstanceSchema.parse(item));
    if (Array.isArray(objectPayload.service_instances)) return objectPayload.service_instances.map((item) => xurrentServiceInstanceSchema.parse(item));
    if (Array.isArray(objectPayload.records)) return objectPayload.records.map((item) => xurrentServiceInstanceSchema.parse(item));
  }
  return [];
}

function pickServiceName(item: XurrentServiceInstance) {
  return item.display_name?.trim() || item.name?.trim() || item.service_instance?.name?.trim() || item.service?.name?.trim() || `Service ${item.id}`;
}

async function suggestedApplicationIdFor(name: string) {
  const mappings = await prisma.externalServiceMapping.findFirst({
    where: { source: "xurrent", externalServiceName: name },
    select: { applicationId: true }
  });
  if (mappings?.applicationId) return mappings.applicationId;

  const apps = await prisma.application.findMany({ where: { isActive: true } });
  return apps.find((app) => textIncludes(name, [app.name, app.statusPageLabel, app.code]))?.id ?? null;
}

export async function syncXurrentServiceCatalog() {
  if (!env.XURRENT_API_BASE_URL || !env.XURRENT_API_TOKEN) {
    throw new Error("Set XURRENT_API_BASE_URL and XURRENT_API_TOKEN before syncing services.");
  }

  const response = await fetch(`${normalizeBaseUrl()}/service_instances`, {
    headers: xurrentHeaders(),
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Xurrent service sync failed with ${response.status}.`);
  }

  const payload = await response.json();
  const items = extractItems(payload);
  if (!items.length) throw new Error("No service instances were returned by Xurrent.");

  let synced = 0;
  for (const item of items) {
    const externalServiceId = String(item.id);
    const externalServiceName = pickServiceName(item);
    const sourceServiceName = item.service?.name?.trim() || item.support_team?.name?.trim() || null;
    const suggestedApplicationId = await suggestedApplicationIdFor(externalServiceName);

    await prisma.externalServiceCatalogItem.upsert({
      where: { source_externalServiceId: { source: "xurrent", externalServiceId } },
      update: {
        externalServiceName,
        sourceServiceName,
        environment: item.environment?.trim() || null,
        suggestedApplicationId,
        rawJson: item as Prisma.InputJsonValue,
        lastSyncedAt: new Date()
      },
      create: {
        source: "xurrent",
        externalServiceId,
        externalServiceName,
        sourceServiceName,
        environment: item.environment?.trim() || null,
        suggestedApplicationId,
        rawJson: item as Prisma.InputJsonValue
      }
    });
    synced += 1;
  }

  return { synced };
}
