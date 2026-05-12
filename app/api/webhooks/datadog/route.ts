import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processDatadogWebhook } from "@/lib/datadog-processing";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

function verifyDatadogSecret(request: NextRequest) {
  if (!env.DATADOG_WEBHOOK_SECRET) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("x-statushub-secret") ?? request.headers.get("x-datadog-webhook-secret");
  if (!header || header.length !== env.DATADOG_WEBHOOK_SECRET.length) return false;
  return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(env.DATADOG_WEBHOOK_SECRET));
}

function verifyOptionalSignature(rawBody: string, request: NextRequest) {
  const signature = request.headers.get("x-statushub-signature");
  if (!env.DATADOG_WEBHOOK_SECRET || !signature) return true;
  const expected = `sha256=${crypto.createHmac("sha256", env.DATADOG_WEBHOOK_SECRET).update(rawBody).digest("hex")}`;
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit("webhook:datadog", 120, 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: rateLimitHeaders(limit) });
    }
    if (process.env.NODE_ENV === "production" && !env.DATADOG_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Datadog webhook secret is not configured" }, { status: 503 });
    }
    const rawBody = await request.text();
    if (!verifyDatadogSecret(request) || !verifyOptionalSignature(rawBody, request)) {
      return NextResponse.json({ error: "Invalid Datadog webhook secret" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const result = await processDatadogWebhook(payload, request.headers.get("x-statushub-signature"));
    return NextResponse.json({ ok: true, duplicate: result.duplicate, incidentId: result.incident?.id ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Datadog webhook processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
