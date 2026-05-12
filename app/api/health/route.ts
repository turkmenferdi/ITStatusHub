import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

function deploymentChecks() {
  const checks = {
    smtpConfigured: Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS),
    productionEmailMode: !env.DEV_EMAIL_MODE,
    xurrentWebhookSecret: Boolean(env.XURRENT_WEBHOOK_SECRET && env.XURRENT_WEBHOOK_SECRET !== "change-me-local-secret"),
    datadogWebhookSecret: Boolean(env.DATADOG_WEBHOOK_SECRET && env.DATADOG_WEBHOOK_SECRET !== "change-me-datadog-secret"),
    sessionSecret: Boolean(env.SESSION_SECRET && env.SESSION_SECRET !== "change-me-session-secret" && env.SESSION_SECRET !== "local-session-secret"),
    adminPasswordChanged: Boolean(env.ADMIN_PASSWORD && env.ADMIN_PASSWORD !== "admin")
  };
  return {
    checks,
    ready: Object.values(checks).every(Boolean)
  };
}

export async function GET() {
  const startedAt = Date.now();
  const deployment = deploymentChecks();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const activeUsers = await prisma.user.count({ where: { isActive: true } });
    return NextResponse.json({
      ok: true,
      service: "StatusHub",
      checks: {
        database: "ok",
        identityStore: activeUsers > 0 ? "ok" : "needs-attention",
        emailMode: env.DEV_EMAIL_MODE ? "dev" : "smtp",
        deployment: deployment.ready && activeUsers > 0 ? "ok" : "needs-attention"
      },
      deployment: { ...deployment, activeUsers },
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "StatusHub",
        checks: { database: "failed" },
        error: error instanceof Error ? error.message : "Health check failed",
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
