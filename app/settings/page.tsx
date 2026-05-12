import { Shell } from "@/components/Shell";
import { Card, PageHeader, ReadinessBadge, SectionHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { SmtpTestButton } from "@/components/SmtpTestButton";
import { env } from "@/lib/env";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

function ConfigRow({ label, value, status }: { label: string; value: string; status?: "ok" | "missing" | "dev" }) {
  const statusColor = {
    ok:      "bg-emerald-50 text-emerald-700 border-emerald-200",
    missing: "bg-red-50 text-red-700 border-red-200",
    dev:     "bg-amber-50 text-amber-700 border-amber-200"
  }[status ?? "ok"];

  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <p className="mt-0.5 font-mono text-sm font-semibold text-slate-800">{value}</p>
      </div>
      {status && (
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${statusColor}`}>
          {status === "ok" ? "Configured" : status === "missing" ? "Missing" : "Dev Mode"}
        </span>
      )}
    </div>
  );
}

export default async function SettingsPage() {
  await requireRole(["admin"]);
  const smtpOk     = Boolean(env.SMTP_HOST && env.SMTP_USER);
  const xurrentOk  = Boolean(env.XURRENT_WEBHOOK_SECRET && env.XURRENT_WEBHOOK_SECRET !== "change-me-local-secret");
  const datadogOk  = Boolean(env.DATADOG_WEBHOOK_SECRET && env.DATADOG_WEBHOOK_SECRET !== "change-me-datadog-secret");
  const sessionOk  = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET !== "change-me-session-secret");

  const appUrl = env.APP_URL || "http://localhost:3001";

  return (
    <Shell title="Settings">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Control email delivery, webhook security, and environment configuration from one place."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        {/* -- Left column -------------------------------------- */}
        <div className="space-y-5">

          {/* Email / SMTP */}
          <Card>
            <SectionHeader icon="outgoing_mail" title="Email (SMTP)" subtitle="Outbound notification delivery settings." />
            <div className="divide-y divide-slate-100">
              <ConfigRow label="Mode"      value={env.DEV_EMAIL_MODE ? "Development (logged to console)" : "Production (SMTP)"}
                status={env.DEV_EMAIL_MODE ? "dev" : smtpOk ? "ok" : "missing"} />
              <ConfigRow label="SMTP Host" value={env.SMTP_HOST || "Not configured"} status={env.SMTP_HOST ? "ok" : "missing"} />
              <ConfigRow label="SMTP Port" value={String(env.SMTP_PORT)} />
              <ConfigRow label="SMTP User" value={env.SMTP_USER || "Not configured"} status={env.SMTP_USER ? "ok" : "missing"} />
              <ConfigRow label="From Address" value={env.SMTP_FROM || "Not configured"} />
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="mb-3 text-sm font-bold text-slate-800">Send a test email</p>
              <p className="mb-3 text-xs leading-5 text-slate-500">
                {env.DEV_EMAIL_MODE
                  ? "Dev mode is active - test emails are logged to console. Set DEV_EMAIL_MODE=false and configure SMTP to send real emails."
                  : "Verify your SMTP settings by sending a test email to any address."}
              </p>
              <SmtpTestButton />
            </div>
          </Card>

          {/* Webhook endpoints */}
          <Card>
            <SectionHeader icon="webhook" title="Webhook Endpoints" subtitle="Register these URLs in your integrations." />
            <div className="space-y-3">
              {[
                { label: "4me / Xurrent",   path: "/api/webhooks/xurrent",  header: "x-xurrent-webhook-secret", secret: env.XURRENT_WEBHOOK_SECRET,  ok: xurrentOk  },
                { label: "Datadog Monitor", path: "/api/webhooks/datadog",  header: "x-statushub-secret",        secret: env.DATADOG_WEBHOOK_SECRET,  ok: datadogOk  }
              ].map(({ label, path, header, secret, ok }) => (
                <div key={path} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-extrabold text-slate-900">{label}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {ok ? "Ready" : "Default secret - update before production"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <code className="flex-1 truncate text-xs font-mono text-slate-700">{appUrl}{path}</code>
                    <Icon name="content_copy" className="shrink-0 text-[16px] text-slate-400" />
                  </div>
                  {secret && (
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-xs text-slate-500">Header: <code className="font-mono text-slate-700">{header}</code></p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Xurrent / 4me API */}
          <Card>
            <SectionHeader icon="hub" title="4me / Xurrent API" subtitle="Optional: used for read-back and enrichment." />
            <div className="divide-y divide-slate-100">
              <ConfigRow label="API Base URL" value={env.XURRENT_API_BASE_URL || "Not configured"}
                status={env.XURRENT_API_BASE_URL ? "ok" : "missing"} />
              <ConfigRow label="API Token"    value={env.XURRENT_API_TOKEN ? "************" : "Not configured"}
                status={env.XURRENT_API_TOKEN ? "ok" : "missing"} />
            </div>
          </Card>
        </div>

        {/* -- Right column ------------------------------------- */}
        <div className="space-y-5">
          {/* Configuration checklist */}
          <Card>
            <SectionHeader icon="verified" title="Launch Checklist" subtitle="Configuration that must be in place before teams rely on StatusHub." />
            <div className="space-y-1.5">
              <ReadinessBadge ready={smtpOk}     label="SMTP configured"        detail={smtpOk ? "Host + credentials set" : "Set SMTP_HOST, SMTP_USER, SMTP_PASS"} />
              <ReadinessBadge ready={!env.DEV_EMAIL_MODE} label="Production email mode" detail={env.DEV_EMAIL_MODE ? "Set DEV_EMAIL_MODE=false" : "Emails will be sent via SMTP"} />
              <ReadinessBadge ready={xurrentOk}  label="Xurrent webhook secret"  detail={xurrentOk ? "Secret is not the default value" : "Update XURRENT_WEBHOOK_SECRET"} />
              <ReadinessBadge ready={datadogOk}  label="Datadog webhook secret"  detail={datadogOk ? "Secret is not the default value" : "Update DATADOG_WEBHOOK_SECRET"} />
              <ReadinessBadge ready={sessionOk}  label="Session secret"          detail={sessionOk ? "Secret is not the default value" : "Update SESSION_SECRET in .env"} />
              <ReadinessBadge ready={process.env.ADMIN_PASSWORD !== "admin"} label="Admin password changed" detail={process.env.ADMIN_PASSWORD !== "admin" ? "Password has been updated" : "Change default admin/admin credentials"} />
            </div>
          </Card>

          {/* How to update settings */}
          <Card>
            <SectionHeader icon="info" title="How to Update Settings" />
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-extrabold text-slate-800">1. Edit the .env file</p>
                <code className="mt-2 block rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-mono text-emerald-400">
                  # .env<br />
                  SMTP_HOST=smtp.yourdomain.com<br />
                  SMTP_USER=alerts@yourdomain.com<br />
                  DEV_EMAIL_MODE=false
                </code>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-extrabold text-slate-800">2. Restart the server</p>
                <code className="mt-2 block rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-mono text-emerald-400">
                  node_modules/.bin/next start -p 3001
                </code>
              </div>
              <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                <p className="text-xs font-bold text-cyan-900">Settings are read from environment variables at startup. The server must be restarted after changes.</p>
              </div>
            </div>
          </Card>

          {/* App info */}
          <Card>
            <SectionHeader icon="info" title="About StatusHub" />
            <div className="space-y-2">
              {[
                ["Version",     "1.0.0"],
                ["Environment", env.DEV_EMAIL_MODE ? "Development" : "Production"],
                ["App URL",     appUrl],
                ["Database",    "PostgreSQL (connected)"]
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-slate-100 py-2 last:border-0">
                  <span className="text-xs text-slate-500">{k}</span>
                  <span className="text-xs font-bold text-slate-800">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
