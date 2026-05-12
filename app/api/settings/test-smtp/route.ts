import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { deliverTemplateTestEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to } = z.object({ to: z.string().email("Invalid email address") }).parse(body);

    const result = await deliverTemplateTestEmail({
      to,
      templateId: "smtp-test",
      subject: "[StatusHub] SMTP Configuration Test",
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px"><h1 style="color:#0f172a">SMTP Configuration Working</h1><p style="color:#64748b">Your SMTP settings are correctly configured. Incident notifications will be delivered to stakeholders.</p><p style="color:#166534;font-size:13px">Sent from ${env.APP_URL}</p></div>`,
      text: `StatusHub - SMTP Configuration Test\n\nYour SMTP settings are correctly configured.\n\nSent from ${env.APP_URL}`
    });

    return NextResponse.json({
      ok: true,
      mode: result.deliveryMode,
      message: result.deliveryMode === "dev"
        ? `Dev mode - email logged to console. Configure SMTP to send real emails.`
        : `Test email sent to ${to}. Check your inbox.`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP connection failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
