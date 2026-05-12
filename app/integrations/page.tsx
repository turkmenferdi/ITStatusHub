import { Shell } from "@/components/Shell";
import { Card, PageHeader, ReadinessBadge, SectionHeader, TextLinkButton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const xurrentPayload = `{
  "event_id": "xurrent-event-123",
  "event_type": "request.updated",
  "request": {
    "id": "REQ-10042",
    "subject": "Website checkout errors",
    "service": "Website",
    "priority": "P1",
    "major_incident_status": "approved",
    "environment": "production",
    "summary": "Customers are seeing elevated error rates during checkout.",
    "approved": true,
    "working_teams": "SRE On-Call, Backend Platform",
    "next_update_at": "2026-04-17T10:00:00.000Z"
  }
}`;

const datadogPayload = `{
  "monitor_id": "$ALERT_ID",
  "alert_transition": "$ALERT_TRANSITION",
  "alert_status": "$ALERT_STATUS",
  "title": "$EVENT_TITLE",
  "message": "$TEXT_ONLY_MSG",
  "priority": "$PRIORITY",
  "service": "Website",
  "tags": "$TAGS"
}`;

const priorityMapping = [
  { priority: "P1",         color: "red",    label: "Major Outage",  desc: "Service is down or critical functionality unavailable",   dot: "bg-red-500" },
  { priority: "P2",         color: "yellow", label: "Degraded",      desc: "Service is impaired, performance degraded",              dot: "bg-amber-500" },
  { priority: "Maintenance",color: "blue",   label: "Maintenance",   desc: "Scheduled maintenance window",                           dot: "bg-sky-500" },
  { priority: "Other",      color: "yellow", label: "Degraded",      desc: "Default mapping for unrecognized priority values",       dot: "bg-amber-500" }
];

export default async function IntegrationsPage() {
  const [apps, groups, templates, webhooks] = await Promise.all([
    prisma.application.count({ where: { isActive: true } }),
    prisma.notificationGroup.count({ where: { isActive: true } }),
    prisma.messageTemplate.count(),
    prisma.webhookEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10 })
  ]);

  const appUrl       = env.APP_URL.replace(/\/$/, "");
  const webhookUrl   = `${appUrl}/api/webhooks/xurrent`;
  const datadogUrl   = `${appUrl}/api/webhooks/datadog`;
  const healthUrl    = `${appUrl}/api/health`;
  const simulatorUrl = `${appUrl}/api/dev/simulate-xurrent`;
  const xurrentSecretOk = Boolean(env.XURRENT_WEBHOOK_SECRET && env.XURRENT_WEBHOOK_SECRET !== "change-me-local-secret");
  const datadogSecretOk = Boolean(env.DATADOG_WEBHOOK_SECRET && env.DATADOG_WEBHOOK_SECRET !== "change-me-datadog-secret");

  return (
    <Shell title="Integrations">
      <PageHeader
        eyebrow="Integration Center"
        title="Connect 4me, Datadog & SMTP"
        description="Configure inbound webhooks and email delivery. StatusHub automatically processes Major Incidents from 4me/Xurrent and monitor alerts from Datadog."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="space-y-5">

          {/* -- Priority -> Status Color Mapping ----------- */}
          <Card>
            <SectionHeader icon="palette" title="Priority -> Status Color Mapping" subtitle="How 4me/Xurrent incident priority maps to StatusHub status colors." />
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-bold uppercase tracking-widest text-slate-500">
                    <th className="px-4 py-3 text-left">4me Priority</th>
                    <th className="px-4 py-3 text-left">Status Color</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Status Label</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {priorityMapping.map((row) => (
                    <tr key={row.priority} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-800">{row.priority}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-3 w-3 rounded-full ${row.dot}`} />
                          <span className="text-xs font-bold text-slate-700 capitalize">{row.color}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs font-semibold text-slate-600">{row.label}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-slate-500">{row.desc}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              The automatically assigned color can be manually overridden by operators from the Incident Detail page at any time.
            </p>
          </Card>

          {/* -- 4me/Xurrent Webhook ----------------------- */}
          <Card>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700">POST</span>
                  <h3 className="font-headline text-lg font-extrabold text-slate-950">4me / Xurrent Webhook</h3>
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  Point your 4me Major Incident webhook at this URL. When an incident is approved,
                  StatusHub automatically creates or updates an incident record.
                </p>
              </div>
              <Icon name="hub" className="shrink-0 text-[28px] text-emerald-600" />
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-950 px-5 py-3 font-mono text-xs leading-6 text-emerald-300">{webhookUrl}</div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Authentication header</p>
                <p className="mt-1.5 font-mono text-xs text-slate-700">x-xurrent-webhook-secret: &lt;your-secret&gt;</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">HMAC signature header</p>
                <p className="mt-1.5 font-mono text-xs text-slate-700">x-xurrent-signature: &lt;hmac-sha256&gt;</p>
              </div>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 transition">
                Show example payload
              </summary>
              <pre className="mt-2 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">{xurrentPayload}</pre>
            </details>
          </Card>

          {/* -- Datadog Webhook ---------------------------- */}
          <Card>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-extrabold text-violet-700">POST</span>
                  <h3 className="font-headline text-lg font-extrabold text-slate-950">Datadog Monitor Webhook</h3>
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  Connect Datadog monitor alerts and recoveries to StatusHub incidents. Create a Datadog Webhook integration
                  named <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">statushub</code> and set the URL below.
                </p>
              </div>
              <Icon name="monitoring" className="shrink-0 text-[28px] text-violet-600" />
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-950 px-5 py-3 font-mono text-xs leading-6 text-violet-300">{datadogUrl}</div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Custom header</p>
                <p className="mt-1.5 font-mono text-xs text-slate-700">x-statushub-secret: &lt;your-secret&gt;</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Monitor notification</p>
                <p className="mt-1.5 font-mono text-xs text-slate-700">@webhook-statushub</p>
              </div>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 transition">
                Show Datadog payload template
              </summary>
              <pre className="mt-2 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">{datadogPayload}</pre>
            </details>
          </Card>

          {/* -- Diagnostics ------------------------------- */}
          <Card>
            <SectionHeader icon="api" title="Diagnostics" />
            <div className="space-y-3">
              <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-extrabold text-slate-950">Health check</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">GET {healthUrl}</p>
                </div>
                <TextLinkButton href="/api/health" icon="open_in_new">Open</TextLinkButton>
              </div>
              {env.DEV_EMAIL_MODE && (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-amber-900">Development simulator</p>
                    <p className="mt-0.5 font-mono text-xs text-amber-700">POST {simulatorUrl}</p>
                    <p className="mt-1 text-xs text-amber-700">Only active in dev email mode. Creates a test Xurrent major incident.</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">dev only</span>
                </div>
              )}
            </div>
          </Card>

          {/* -- Recent Webhook Events ---------------------- */}
          <Card>
            <SectionHeader icon="webhook" title="Recent Webhook Events" subtitle="Last 10 events received from all sources." />
            <div className="space-y-2">
              {webhooks.map((event) => (
                <div key={event.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                  <Icon
                    name={event.processed ? "check_circle" : event.processingError ? "error" : "pending"}
                    className={`mt-0.5 shrink-0 text-[18px] ${event.processed ? "text-emerald-500" : event.processingError ? "text-red-500" : "text-amber-500"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold text-slate-950">{event.externalEventId ?? event.id}</p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">
                      {event.source} - {event.eventType} - {event.createdAt.toLocaleString()}
                    </p>
                    {event.processingError && (
                      <p className="mt-1 text-xs leading-5 text-red-600">{event.processingError}</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${event.processed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {event.processed ? "OK" : "pending"}
                  </span>
                </div>
              ))}
              {!webhooks.length && (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                  <Icon name="webhook" className="text-[32px] text-slate-300" />
                  <p className="text-sm font-bold text-slate-500">No webhook events yet</p>
                  <p className="text-xs text-slate-400">Configure 4me or Datadog to start receiving events.</p>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* -- Sidebar ------------------------------------ */}
        <aside className="space-y-5">
          <Card>
            <SectionHeader icon="verified" title="Connection Checklist" />
            <div className="space-y-1.5">
              <ReadinessBadge ready={apps > 0} label="Active services" detail={`${apps} registered`} />
              <ReadinessBadge ready={groups > 0} label="Notification groups" detail={`${groups} active`} />
              <ReadinessBadge ready={templates >= 4} label="Message templates" detail={`${templates} configured`} />
              <ReadinessBadge ready={xurrentSecretOk} label="4me webhook secret" detail={xurrentSecretOk ? "Secret configured" : "Add XURRENT_WEBHOOK_SECRET"} />
              <ReadinessBadge ready={datadogSecretOk} label="Datadog webhook secret" detail={datadogSecretOk ? "Secret configured" : "Add DATADOG_WEBHOOK_SECRET"} />
              <ReadinessBadge ready={!env.DEV_EMAIL_MODE && Boolean(env.SMTP_HOST)} label="SMTP email" detail={env.DEV_EMAIL_MODE ? "Dev mode active" : "SMTP configured"} />
            </div>
          </Card>

          <Card>
            <SectionHeader icon="info" title="Integration Flow" />
            <div className="space-y-3 text-xs leading-5 text-slate-600">
              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-700">1</span>
                <p>4me declares a Major Incident and fires the configured webhook to StatusHub.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-700">2</span>
                <p>StatusHub maps the service and priority to create an incident record with the correct status color.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-700">3</span>
                <p>The operator sends templated notifications to technical, business, and executive groups with one click.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-700">4</span>
                <p>When 4me closes the incident, StatusHub automatically resolves it and returns the service to green.</p>
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeader icon="quick_reference_all" title="Useful Links" />
            <div className="space-y-2">
              <TextLinkButton href="/templates" icon="draft">Message templates</TextLinkButton>
              <TextLinkButton href="/groups" icon="group">Notification groups</TextLinkButton>
              <TextLinkButton href="/applications" icon="apps">Service catalog</TextLinkButton>
              <TextLinkButton href="/api/health" icon="monitor_heart">Diagnostics</TextLinkButton>
            </div>
          </Card>
        </aside>
      </div>
    </Shell>
  );
}
