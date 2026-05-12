import { Shell } from "@/components/Shell";
import { Card, EmptyState, FormNotice, PageHeader, SectionHeader, SubmitButton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { upsertRoutingRuleAction, deleteRoutingRuleAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RoutingRulesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string }>
}) {
  const params = await searchParams;

  const [rules, applications, incidentTypes, groups] = await Promise.all([
    prisma.applicationGroupRule.findMany({
      include: {
        application: true,
        incidentType: true,
        technicalGroup: true,
        businessGroup: true,
        executiveGroup: true,
        maintenanceGroup: true
      },
      orderBy: [{ application: { statusPageOrder: "asc" } }, { incidentType: { severityLevel: "asc" } }]
    }),
    prisma.application.findMany({ where: { isActive: true }, orderBy: [{ statusPageOrder: "asc" }, { name: "asc" }] }),
    prisma.incidentType.findMany({ orderBy: { severityLevel: "asc" } }),
    prisma.notificationGroup.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
  ]);

  const technicalGroups = groups.filter((g) => g.groupType === "technical");
  const businessGroups = groups.filter((g) => g.groupType === "business");
  const executiveGroups = groups.filter((g) => g.groupType === "executive");
  const maintenanceGroups = groups.filter((g) => g.groupType === "maintenance");

  const successMessage = params.created
    ? params.created === "rule-deleted" ? "Routing rule deleted."
    : "Routing rule saved."
    : undefined;

  return (
    <Shell title="Routing Rules">
      <PageHeader
        eyebrow="Notification Routing"
        title="Routing Rules"
        description="Define exactly which notification groups receive emails for each Service + Incident Type combination."
      />
      <FormNotice error={params.error} success={successMessage} />

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* Rules list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{rules.length} rule{rules.length !== 1 ? "s" : ""} configured</p>
          </div>

          {rules.length === 0 && (
            <Card>
              <EmptyState
                icon="rule"
                text="No routing rules configured"
                sub="Without rules, all active groups of the matching type receive notifications. Add rules to route specific service incidents to specific groups."
              />
            </Card>
          )}

          {rules.map((rule) => (
            <Card key={rule.id} className="!p-0 overflow-hidden">
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-800">
                      {rule.application.statusPageLabel}
                    </span>
                    <Icon name="arrow_forward" className="text-[14px] text-slate-400" />
                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                      {rule.incidentType.name}
                    </span>
                  </div>

                  <div className="grid gap-1.5">
                    {rule.technicalGroup && (
                      <div className="flex items-center gap-2">
                        <span className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">Technical</span>
                        <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-bold text-cyan-800 border border-cyan-200">
                          {rule.technicalGroup.name}
                        </span>
                      </div>
                    )}
                    {rule.businessGroup && (
                      <div className="flex items-center gap-2">
                        <span className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">Business</span>
                        <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-800 border border-violet-200">
                          {rule.businessGroup.name}
                        </span>
                      </div>
                    )}
                    {rule.executiveGroup && (
                      <div className="flex items-center gap-2">
                        <span className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">Executive</span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                          {rule.executiveGroup.name}
                        </span>
                      </div>
                    )}
                    {rule.maintenanceGroup && (
                      <div className="flex items-center gap-2">
                        <span className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">Maintenance</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
                          {rule.maintenanceGroup.name}
                        </span>
                      </div>
                    )}
                    {!rule.technicalGroup && !rule.businessGroup && !rule.executiveGroup && !rule.maintenanceGroup && (
                      <p className="text-xs italic text-slate-400">No groups assigned - rule has no effect.</p>
                    )}
                  </div>
                </div>

                <form action={deleteRoutingRuleAction}>
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <button
                    type="submit"
                    title="Delete rule"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Icon name="delete" className="text-[16px]" />
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>

        {/* Create/update rule form */}
        <div className="space-y-4">
          <Card>
            <SectionHeader icon="add_circle" title="Add / Update Rule" subtitle="Creates a new rule or updates an existing one." />
            <form action={upsertRoutingRuleAction} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Service</label>
                <select
                  name="applicationId"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                >
                  <option value="" disabled>Select service</option>
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>{app.statusPageLabel}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Incident Type</label>
                <select
                  name="incidentTypeId"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                >
                  <option value="" disabled>Select type</option>
                  {incidentTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Assign Groups (leave blank to use default)</p>

                {technicalGroups.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-cyan-700">Technical Group</label>
                    <select name="technicalGroupId" className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-400 focus:outline-none">
                      <option value="">- use default -</option>
                      {technicalGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                )}

                {businessGroups.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-violet-700">Business Group</label>
                    <select name="businessGroupId" className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-400 focus:outline-none">
                      <option value="">- use default -</option>
                      {businessGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                )}

                {executiveGroups.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-amber-700">Executive Group</label>
                    <select name="executiveGroupId" className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-400 focus:outline-none">
                      <option value="">- use default -</option>
                      {executiveGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                )}

                {maintenanceGroups.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Maintenance Group</label>
                    <select name="maintenanceGroupId" className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-400 focus:outline-none">
                      <option value="">- use default -</option>
                      {maintenanceGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <SubmitButton>Save Rule</SubmitButton>
            </form>
          </Card>

          <Card>
            <SectionHeader icon="info" title="How Routing Works" />
            <div className="space-y-2 text-xs leading-5 text-slate-600">
              <p><strong>With a rule:</strong> the exactly assigned groups receive the notification for that service+type pair.</p>
              <p><strong>Without a rule:</strong> all active groups matching the incident type&apos;s audience flags receive it.</p>
              <p>Rules are matched by <strong>Service + Incident Type</strong>. One rule per pair.</p>
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
