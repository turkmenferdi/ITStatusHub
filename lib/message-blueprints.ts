import type { IncidentStage } from "@prisma/client";

function emailLayout(title: string, headerColor: string, headerIcon: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <!-- Header -->
      <tr><td style="background:${headerColor};border-radius:12px 12px 0 0;padding:20px 28px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:white">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;opacity:0.8">StatusHub - Incident Communication</p>
              <p style="margin:6px 0 0;font-size:20px;font-weight:800">${headerIcon} ${title}</p>
            </td>
          </tr>
        </table>
      </td></tr>
      <!-- Body -->
      <tr><td style="background:white;padding:28px;border:1px solid #e2e8f0;border-top:0">
        ${body}
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:16px 28px">
        <p style="margin:0;font-size:11px;color:#94a3b8">This is an automated notification from StatusHub. For internal IT use. Do not reply to this message.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function incidentDetailsBlock(): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
    <tr><td style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Incident Details</p>
    </td></tr>
    <tr><td style="padding:0">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;width:40%"><span style="font-size:12px;color:#94a3b8;font-weight:600">Service</span></td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9"><span style="font-size:13px;font-weight:700;color:#0f172a">{{app_name}}</span></td>
        </tr>
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9"><span style="font-size:12px;color:#94a3b8;font-weight:600">Type</span></td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9"><span style="font-size:13px;font-weight:700;color:#0f172a">{{incident_type}}</span></td>
        </tr>
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9"><span style="font-size:12px;color:#94a3b8;font-weight:600">Working Teams</span></td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9"><span style="font-size:13px;font-weight:700;color:#0f172a">{{working_teams}}</span></td>
        </tr>
        <tr>
          <td style="padding:10px 16px"><span style="font-size:12px;color:#94a3b8;font-weight:600">Next Update</span></td>
          <td style="padding:10px 16px"><span style="font-size:13px;font-weight:700;color:#0f172a">{{next_update_at}}</span></td>
        </tr>
      </table>
    </td></tr>
  </table>`;
}

export const messageBlueprints: Record<IncidentStage, { label: string; subject: string; html: string; text: string }> = {
  started: {
    label: "Service disruption",
    subject: "[Disruption] {{app_name}} - {{incident_type}}",
    html: emailLayout(
      "{{app_name}} Service Disruption",
      "#dc2626",
      "!",
      `<p style="margin:0 0 16px;font-size:15px;color:#0f172a;font-weight:700">{{title}}</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569">{{summary}}</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 18px;margin-bottom:20px">
        <p style="margin:0;font-size:13px;font-weight:600;color:#991b1b">Warning: Our technical teams are actively investigating and working to restore service.</p>
      </div>
      ${incidentDetailsBlock()}
      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">You are receiving this because you are in the notification group for {{app_name}} incidents.</p>`
    ),
    text: "INCIDENT STARTED: {{app_name}} - {{incident_type}}\n\n{{title}}\n\n{{summary}}\n\nOur technical teams are actively investigating and working to restore service.\n\nService: {{app_name}}\nType: {{incident_type}}\nWorking Teams: {{working_teams}}\nNext Update: {{next_update_at}}"
  },

  update: {
    label: "Issue ongoing",
    subject: "[Ongoing] {{app_name}} - status update",
    html: emailLayout(
      "{{app_name}} - Status Update",
      "#d97706",
      "!",
      `<p style="margin:0 0 16px;font-size:15px;color:#0f172a;font-weight:700">{{title}}</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569">{{summary}}</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:20px">
        <p style="margin:0;font-size:13px;font-weight:600;color:#92400e">! The issue is ongoing. Our teams continue to work on resolution.</p>
      </div>
      ${incidentDetailsBlock()}
      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">This is a progress update. You will receive another notification when the issue is resolved.</p>`
    ),
    text: "ONGOING ISSUE UPDATE: {{app_name}}\n\n{{title}}\n\n{{summary}}\n\nThe issue is ongoing. Our teams continue to work on resolution.\n\nService: {{app_name}}\nType: {{incident_type}}\nWorking Teams: {{working_teams}}\nNext Update: {{next_update_at}}"
  },

  resolved: {
    label: "Issue resolved",
    subject: "[Resolved] {{app_name}} - service restored",
    html: emailLayout(
      "{{app_name}} - Service Restored",
      "#16a34a",
      "OK",
      `<p style="margin:0 0 16px;font-size:15px;color:#0f172a;font-weight:700">{{title}}</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569">{{summary}}</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin-bottom:20px">
        <p style="margin:0;font-size:13px;font-weight:600;color:#166534">OK The service has returned to normal operation. Thank you for your patience.</p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <tr><td style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Resolved Incident</p>
        </td></tr>
        <tr><td style="padding:10px 16px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;width:40%"><span style="font-size:12px;color:#94a3b8;font-weight:600">Service</span></td>
              <td style="padding:6px 0"><span style="font-size:13px;font-weight:700;color:#0f172a">{{app_name}}</span></td>
            </tr>
            <tr>
              <td style="padding:6px 0"><span style="font-size:12px;color:#94a3b8;font-weight:600">Type</span></td>
              <td style="padding:6px 0"><span style="font-size:13px;font-weight:700;color:#0f172a">{{incident_type}}</span></td>
            </tr>
          </table>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">A post-mortem will be shared once the root cause analysis is complete.</p>`
    ),
    text: "RESOLVED: {{app_name}} - service restored\n\n{{title}}\n\n{{summary}}\n\nThe service has returned to normal operation. Thank you for your patience.\n\nService: {{app_name}}\nType: {{incident_type}}"
  },

  maintenance: {
    label: "Planned maintenance",
    subject: "[Planned Maintenance] {{app_name}}",
    html: emailLayout(
      "{{app_name}} - Planned Maintenance",
      "#0284c7",
      "!",
      `<p style="margin:0 0 16px;font-size:15px;color:#0f172a;font-weight:700">{{title}}</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569">{{summary}}</p>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 18px;margin-bottom:20px">
        <p style="margin:0;font-size:13px;font-weight:600;color:#0369a1">! During the maintenance window, users may experience temporary disruption or degraded performance.</p>
      </div>
      ${incidentDetailsBlock()}
      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">This is a planned maintenance notification. No action is required on your part.</p>`
    ),
    text: "PLANNED MAINTENANCE: {{app_name}}\n\n{{title}}\n\n{{summary}}\n\nDuring the maintenance window, users may experience temporary disruption or degraded performance.\n\nService: {{app_name}}\nResponsible Teams: {{working_teams}}\nNext Update: {{next_update_at}}"
  }
};
