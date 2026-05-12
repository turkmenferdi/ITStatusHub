import { NextResponse } from "next/server";
import { processXurrentWebhook } from "@/lib/webhook-processing";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Development simulator is disabled outside development." }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));
  const now = Date.now();
  const payload = {
    event_id: body.event_id ?? `dev-${now}`,
    event_type: "request.updated",
    request: {
      id: body.requestId ?? `REQ-${now}`,
      subject: body.subject ?? "Website checkout errors",
      service: body.service ?? "Website",
      priority: body.priority ?? "P1",
      major_incident_status: body.major_incident_status ?? "approved",
      environment: body.environment ?? "production",
      summary: body.summary ?? "Users are seeing elevated errors while completing checkout.",
      approved: true,
      working_teams: body.working_teams ?? "DevOps, Backend, SRE On-Call",
      next_update_at: body.next_update_at ?? new Date(Date.now() + 30 * 60 * 1000).toISOString()
    }
  };
  const result = await processXurrentWebhook(payload, "dev-simulator");
  return NextResponse.json({ ok: true, incidentId: result.incident?.id ?? null, duplicate: result.duplicate });
}
