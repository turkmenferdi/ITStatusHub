import { Shell } from "@/components/Shell";
import { Card, FormNotice, PageHeader, SectionHeader, StatusPill, SubmitButton } from "@/components/ui";
import { approvePendingIntakeAction, ignorePendingIntakeAction, mapCatalogServiceAction, syncXurrentServicesAction } from "@/app/actions";
import { automationRules } from "@/lib/automation-rules";
import { prisma } from "@/lib/prisma";

export default async function AutomationPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string }>
}) {
  const params = await searchParams;
  const enabled = automationRules.filter((rule) => rule.enabled).length;
  const [pendingIntakes, applications, mappings, catalogItems] = await Promise.all([
    prisma.pendingIncidentIntake.findMany({
      where: { status: "pending" },
      include: { suggestedApplication: true, incidentType: true },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.application.findMany({ where: { isActive: true }, orderBy: [{ statusPageOrder: "asc" }, { name: "asc" }] }),
    prisma.externalServiceMapping.findMany({
      where: { source: "xurrent" },
      include: { application: true },
      orderBy: { externalServiceName: "asc" },
      take: 12
    }),
    prisma.externalServiceCatalogItem.findMany({
      where: { source: "xurrent" },
      include: { suggestedApplication: true },
      orderBy: [{ lastSyncedAt: "desc" }, { externalServiceName: "asc" }],
      take: 12
    })
  ]);

  return (
    <Shell title="Automation">
      <PageHeader
        eyebrow="Rules v1"
        title="Automation Rules"
        description="Focused workflow automation for Xurrent major incidents, Datadog alert recovery, controlled stakeholder communication, and status visibility."
      />
      <FormNotice error={params.error} success={params.created ? "Automation updated." : undefined} />

      <section className="mb-5 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Enabled rules</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-slate-950">{enabled}</p>
          <p className="mt-1 text-sm text-slate-600">Rules currently active in code-backed v1 automation.</p>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Pending 4me approvals</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-slate-950">{pendingIntakes.length}</p>
          <p className="mt-1 text-sm text-slate-600">Major incidents waiting for communication release.</p>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Primary sources</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-slate-950">3</p>
          <p className="mt-1 text-sm text-slate-600">Xurrent, Datadog, and operator command center actions.</p>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Positioning</p>
          <p className="mt-2 font-headline text-xl font-extrabold text-slate-950">Approval-first</p>
          <p className="mt-1 text-sm text-slate-600">4me can declare; StatusHub controls communication release.</p>
        </Card>
      </section>

      <div className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <SectionHeader
            icon="verified"
            title="Pending 4me Major Incidents"
            subtitle="4me remains the source of truth. StatusHub waits for operator approval before communication and status page release."
          />
          <div className="space-y-3">
            {pendingIntakes.map((intake) => (
              <div key={intake.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-800">4me pending</span>
                    <StatusPill color={intake.incidentType.defaultColor} label={intake.priority ?? intake.incidentType.name} />
                  </div>
                  <h3 className="mt-2 font-headline text-xl font-extrabold text-slate-950">{intake.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{intake.summary}</p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-3">
                    <p><strong className="text-slate-900">4me service:</strong> {intake.externalServiceName}</p>
                    <p><strong className="text-slate-900">Request:</strong> {intake.externalRequestId}</p>
                    <p><strong className="text-slate-900">Suggested:</strong> {intake.suggestedApplication?.name ?? "Needs mapping"}</p>
                  </div>
                </div>

                <form action={approvePendingIntakeAction} className="mt-4 grid gap-3 border-t border-amber-200/70 pt-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <input type="hidden" name="intakeId" value={intake.id} />
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-amber-900">Map to StatusHub service</label>
                    <select name="applicationId" defaultValue={intake.suggestedApplicationId ?? ""} required className="w-full bg-white">
                      <option value="" disabled>Select service</option>
                      {applications.map((app) => (
                        <option key={app.id} value={app.id}>{app.statusPageLabel}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                    <input type="checkbox" name="createMapping" defaultChecked />
                    Remember mapping
                  </label>
                  <div className="flex items-end">
                    <SubmitButton>Approve intake</SubmitButton>
                  </div>
                </form>
                <form action={ignorePendingIntakeAction} className="mt-2">
                  <input type="hidden" name="intakeId" value={intake.id} />
                  <button className="text-xs font-bold text-slate-500 transition hover:text-red-700">Ignore this intake</button>
                </form>
              </div>
            ))}
            {!pendingIntakes.length && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <p className="font-bold text-slate-700">No pending 4me major incidents</p>
                <p className="mt-1 text-sm text-slate-500">New approved major incidents from 4me will wait here for communication approval.</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader icon="account_tree" title="4me Service Mappings" subtitle="Service instance names remembered from approved intakes." />
          <div className="space-y-2">
            {mappings.map((mapping) => (
              <div key={mapping.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="truncate text-sm font-bold text-slate-900">{mapping.externalServiceName}</p>
                <p className="mt-1 text-xs text-slate-500">maps to <strong>{mapping.application.statusPageLabel}</strong></p>
              </div>
            ))}
            {!mappings.length && (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Approve a 4me intake with “Remember mapping” to build this list.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <SectionHeader icon="hub" title="Service Sync" subtitle="Prepare mappings before the next major incident arrives." />
          <p className="text-sm leading-6 text-slate-600">
            Pull 4me service instances into a local catalog, review suggested matches, and save mappings before an incident happens.
          </p>
          <form action={syncXurrentServicesAction} className="mt-4 space-y-3">
            <SubmitButton>Sync 4me services</SubmitButton>
            <p className="text-xs text-slate-500">Requires `XURRENT_API_BASE_URL`, `XURRENT_API_TOKEN`, and optionally `XURRENT_ACCOUNT_ID`.</p>
          </form>
        </Card>

        <Card>
          <SectionHeader icon="dns" title="4me Service Catalog" subtitle="Synced service instances and suggested StatusHub matches." />
          <div className="space-y-3">
            {catalogItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-950">{item.externalServiceName}</p>
                  {item.environment && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-600">{item.environment}</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">Last synced {item.lastSyncedAt.toLocaleString()}</p>
                <form action={mapCatalogServiceAction} className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <input type="hidden" name="catalogItemId" value={item.id} />
                  <select name="applicationId" defaultValue={item.suggestedApplicationId ?? ""} className="w-full bg-slate-50">
                    <option value="" disabled>Select StatusHub service</option>
                    {applications.map((app) => (
                      <option key={app.id} value={app.id}>{app.statusPageLabel}</option>
                    ))}
                  </select>
                  <SubmitButton>Save mapping</SubmitButton>
                </form>
                {item.suggestedApplication && (
                  <p className="mt-2 text-xs text-emerald-700">Suggested match: <strong>{item.suggestedApplication.statusPageLabel}</strong></p>
                )}
              </div>
            ))}
            {!catalogItems.length && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <p className="font-bold text-slate-700">No synced service instances yet</p>
                <p className="mt-1 text-sm text-slate-500">Run a service sync to build the 4me catalog inside StatusHub.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {automationRules.map((rule) => (
          <Card key={rule.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-headline text-xl font-extrabold text-slate-950">{rule.name}</h3>
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-extrabold text-cyan-800">{rule.source}</span>
                  <span className={rule.enabled ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600"}>
                    {rule.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold text-slate-700">{rule.trigger}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Conditions</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {rule.conditions.map((condition) => <li key={condition}>- {condition}</li>)}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Actions</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {rule.actions.map((action) => <li key={action}>- {action}</li>)}
                </ul>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
