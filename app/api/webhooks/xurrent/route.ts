import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processXurrentWebhook } from "@/lib/webhook-processing";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

function verifySignature(rawBody: string, request: NextRequest) {
  if (!env.XURRENT_WEBHOOK_SECRET) return process.env.NODE_ENV !== "production";

  const secretQuery = request.nextUrl.searchParams.get("secret");
  if (secretQuery && process.env.NODE_ENV !== "production") return secretQuery === env.XURRENT_WEBHOOK_SECRET;

  const secretHeader = request.headers.get("x-xurrent-webhook-secret");
  if (secretHeader) {
    if (secretHeader.length !== env.XURRENT_WEBHOOK_SECRET.length) return false;
    return crypto.timingSafeEqual(Buffer.from(secretHeader), Buffer.from(env.XURRENT_WEBHOOK_SECRET));
  }

  const signature = request.headers.get("x-xurrent-signature") ?? request.headers.get("x-hub-signature-256");
  if (!signature) return false;
  const expected = `sha256=${crypto.createHmac("sha256", env.XURRENT_WEBHOOK_SECRET).update(rawBody).digest("hex")}`;
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit("webhook:xurrent", 120, 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: rateLimitHeaders(limit) });
    }
    if (process.env.NODE_ENV === "production" && !env.XURRENT_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Xurrent webhook secret is not configured" }, { status: 503 });
    }
    const rawBody = await request.text();
    if (!verifySignature(rawBody, request)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
    const payload = JSON.parse(rawBody);
    if (!payload?.request) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "Payload does not include request details. Use an automation rule with the custom StatusHub payload for incident creation."
      });
    }
    const result = await processXurrentWebhook(payload, request.headers.get("x-xurrent-signature"));
    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate,
      incidentId: result.incident?.id ?? null,
      intakeId: "intake" in result ? result.intake?.id ?? null : null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
