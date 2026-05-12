import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Card, FormNotice, PageHeader, SectionHeader, SubmitButton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { createTemplateAction, sendTemplateTestEmailAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { renderTemplate } from "@/lib/template";
import { messageBlueprints } from "@/lib/message-blueprints";

export const dynamic = "force-dynamic";

const stageConfig: Record<string, { label: string; dot: string; ring: string }> = {
  started:     { label: "Incident Started",  dot: "bg-cyan-500",    ring: "border-cyan-200 bg-cyan-50 text-cyan-800"    },
  update:      { label: "Progress Update",   dot: "bg-amber-500",   ring: "border-amber-200 bg-amber-50 text-amber-800"   },
  resolved:    { label: "Incident Resolved", dot: "bg-emerald-500", ring: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  maintenance: { label: "Maintenance",       dot: "bg-sky-500",     ring: "border-sky-200 bg-sky-50 text-sky-800"    }
};

const sampleContext = {
  app_name:       "Website",
  incident_type:  "Full Outage",
  title:          "Checkout error rate is elevated",
  summary:        "Customers are seeing elevated errors while completing checkout. Our SRE team is actively investigating.",
  working_teams:  "Web Platform, SRE On-Call",
  next_update_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  stage:          "update" as const,
  status_color:   "red" as const
};

export default async function TemplatesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string; delivery?: string }>
}) {
  const params = await searchParams;
  const [templates, apps, types] = await Promise.all([
    prisma.messageTemplate.findMany({
      include: { application: true, incidentType: true },
      orderBy: [{ stage: "asc" }, { createdAt: "asc" }]
    }),
    prisma.application.findMany({ orderBy: { name: "asc" } }),
    prisma.incidentType.findMany({ orderBy: { name: "asc" } })
  ]);

  const grouped = Object.entries(stageConfig).map(([stage, cfg]) => ({
    stage,
    cfg,
    items: templates.filter(t => t.stage === stage)
  }));

  return (
    <Shell title="Templates">
      <PageHeader
        eyebrow="Stakeholder Communication"
        title="Message Templates"
        description="Manage approved incident communication copy for each stage of the incident lifecycle. All variables are auto-filled from the active incident."
      />

      <FormNotice
        error={params.error}
        success={
          params.created === "test-email"
            ? `Test email ${params.delivery === "sent" ? "sent" : "logged (dev mode)"}. Check ${params.delivery === "sent" ? "your inbox" : "the server console"}.`
            : params.created === "template"
            ? "Template created successfully."
            : undefined
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        {/* -- Template library --------------------------------- */}
        <div className="space-y-5">
          {grouped.map(({ stage, cfg, items }) => (
            <Card key={stage}>
              <div className="mb-4 flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                <h3 className="text-sm font-extrabold text-slate-900">{cfg.label}</h3>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${cfg.ring}`}>
                  {items.length} template{items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {items.length > 0 ? (
                <div className="space-y-3">
                  {items.map(t => {
                    const rendered = renderTemplate(t, { ...sampleContext, stage: t.stage });
                    const scopeLabel = [t.application?.name, t.incidentType?.name].filter(Boolean).join(" + ") || "Default (all apps & types)";
                    return (
                      <div key={t.id} className="group rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white hover:shadow-card">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-500 truncate">{scopeLabel}</p>
                            {t.isDefault && (
                              <span className="mt-1 inline-block rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-600">DEFAULT FALLBACK</span>
                            )}
                          </div>
                          <Link
                            href={`/templates/${t.id}/edit`}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 opacity-0 transition group-hover:opacity-100 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
                          >
                            <Icon name="edit" className="text-[14px]" />
                            Edit
                          </Link>
                        </div>

                        {/* Subject preview */}
                        <div className="rounded-lg border border-white bg-white p-3">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Subject</p>
                          <p className="text-sm font-extrabold text-slate-950">{rendered.subject}</p>
                          <div className="mt-2 border-t border-slate-100 pt-2">
                            <p className="text-xs leading-5 text-slate-500 line-clamp-3">{rendered.text.slice(0, 240)}{rendered.text.length > 240 ? "..." : ""}</p>
                          </div>
                        </div>

                        {/* Test email form */}
                        <form action={sendTemplateTestEmailAction} className="mt-3 flex gap-2">
                          <input type="hidden" name="templateId" value={t.id} />
                          <input
                            name="to"
                            type="email"
                            placeholder="test@example.com"
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/20"
                            required
                          />
                          <SubmitButton variant="secondary">
                            <Icon name="send" className="text-[14px]" />
                            Send test
                          </SubmitButton>
                        </form>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center">
                  <Icon name="draft" className="mx-auto text-[28px] text-slate-300" />
                  <p className="mt-2 text-xs font-bold text-slate-500">No {cfg.label.toLowerCase()} template yet</p>
                  <p className="mt-1 text-xs text-slate-400">Create one below - the default blueprint will be used until then.</p>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* -- Create sidebar ----------------------------------- */}
        <div className="space-y-4">
          <Card>
            <SectionHeader icon="note_add" title="New Template" subtitle="Create a targeted template for a specific service, incident type, or stage." />

            <form action={createTemplateAction} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">Stage</label>
                <select name="stage" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="started">Incident Started</option>
                  <option value="update">Progress Update</option>
                  <option value="resolved">Incident Resolved</option>
                  <option value="maintenance">Planned Maintenance</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">Application (optional)</label>
                <select name="applicationId" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">Any application</option>
                  {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">Incident Type (optional)</label>
                <select name="incidentTypeId" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">Any type</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <label className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition">
                <input type="checkbox" name="isDefault" className="rounded" />
                <div>
                  <span className="text-sm font-bold text-slate-800">Default fallback</span>
                  <p className="text-xs text-slate-500">Used when no other template matches</p>
                </div>
              </label>

              <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                <p className="text-xs font-extrabold text-cyan-900">Default professional copy</p>
                <p className="mt-1 text-xs leading-5 text-cyan-700">
                  Includes service name, incident type, summary, working teams, and next update time. Edit after creating.
                </p>
              </div>

              <SubmitButton>Create Template</SubmitButton>
            </form>
          </Card>

          {/* Variable reference */}
          <Card>
            <SectionHeader icon="info" title="Template Variables" />
            <div className="space-y-1.5">
              {[
                ["{{app_name}}",       "Service name"],
                ["{{incident_type}}",  "Incident type"],
                ["{{title}}",          "Incident title"],
                ["{{summary}}",        "Summary paragraph"],
                ["{{working_teams}}",  "Teams working on it"],
                ["{{next_update_at}}", "Next update time"],
                ["{{stage}}",          "Current stage"],
                ["{{status_color}}",   "Color (red/yellow/green/blue)"]
              ].map(([v, d]) => (
                <div key={v} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <code className="text-[10px] font-mono font-bold text-cyan-700 shrink-0">{v}</code>
                  <span className="text-xs text-slate-500">{d}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
