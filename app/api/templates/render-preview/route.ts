import { NextResponse } from "next/server";
import { renderString } from "@/lib/template";

const SAMPLE_CONTEXT = {
  app_name: "Website",
  incident_type: "Full Outage",
  title: "Checkout error rate is elevated",
  summary: "Customers are seeing elevated errors while completing checkout. Our teams are actively investigating.",
  working_teams: "Web Platform, SRE On-Call",
  next_update_at: new Date(Date.now() + 30 * 60 * 1000).toLocaleString(),
  stage: "started",
  status_color: "red"
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subjectTemplate = "", bodyHtmlTemplate = "", bodyTextTemplate = "" } = body;

    return NextResponse.json({
      subject: renderString(subjectTemplate, SAMPLE_CONTEXT),
      html: renderString(bodyHtmlTemplate, SAMPLE_CONTEXT),
      text: renderString(bodyTextTemplate, SAMPLE_CONTEXT)
    });
  } catch {
    return NextResponse.json({ error: "Preview failed" }, { status: 400 });
  }
}
