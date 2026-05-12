import { Shell } from "@/components/Shell";
import { Card, FormNotice, PageHeader, SectionHeader, StatusPill, SubmitButton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { createApplicationAction, createApplicationDependencyAction, deactivateApplicationDependencyAction, deleteApplicationAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import type { StatusColor } from "@prisma/client";
import { StatusPageOrderEditor } from "@/components/StatusPageOrderEditor";

export const dynamic = "force-dynamic";

const impactLabel: Record<StatusColor, string> = {
  green:  "Informational",
  yellow: "Degraded",
  red:    "Major Outage",
  blue:   "Maintenance"
};

const impactDot: Record<StatusColor, string> = {
  green:  "bg-emerald-500",
  yellow: "bg-amber-500",
  red:    "bg-red-500",
  blue:   "bg-sky-500"
};

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const params = await searchParams;
  const [apps, dependencies] = await Promise.all([
    prisma.application.findMany({
      include: {
        externalServiceMappings: { where: { source: "xurrent" } },
        externalServiceCatalogItems: { where: { source: "xurrent" } },
        upstreamDependencies:   { include: { downstreamApplication: true }, where: { isActive: true } },
        downstreamDependencies: { include: { upstreamApplication: true  }, where: { isActive: true } }
      },
      orderBy: [{ statusPageOrder: "asc" }, { name: "asc" }]
    }),
    prisma.applicationDependency.findMany({
      where: { isActive: true },
      include: { upstreamApplication: true, downstreamApplication: true },
      orderBy: { createdAt: "asc" }
    })
  ]);
  const mappedCount = apps.filter((app) => app.externalServiceMappings.length > 0).length;
  const catalogSuggestedCount = apps.filter((app) => app.externalServiceCatalogItems.length > 0).length;

  return (
    <Shell title="Applications">
      <PageHeader
        eyebrow="Service Catalog"
        title="Services & Dependency Map"
        description="Register services for status tracking, define dependency chains, and control status page ordering."
      />
      <FormNotice
        error={params.error}
        success={
          params.created === "dependency"         ? "Dependency link saved."
          : params.created === "dependency-removed" ? "Dependency link removed."
          : params.created === "order"              ? "Status page order saved."
          : params.created === "application-deleted"   ? "Application deleted."
          : params.created === "application-updated"   ? "Application updated."
          : params.created                              ? "Application created."
          : undefined
        }
      />

      {/* -- Dependency Map Header ---------------------------- */}
      <div className="mb-5 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl">
        <div className="px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Dependency Map</p>
              <h3 className="mt-1 font-headline text-2xl font-extrabold">Service Impact Propagation</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Define parent-child service relationships. When a parent service has an active incident, StatusHub automatically
                shows impacted downstream services on the status page - with appropriate degradation levels.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2">
              <Icon name="hub" className="text-emerald-400 text-[20px]" />
              <div>
                <p className="text-lg font-extrabold text-white">{dependencies.length}</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Active links</p>
              </div>
            </div>
          </div>

          {/* Visual dependency preview */}
          {dependencies.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {dependencies.slice(0, 6).map((dep) => (
                <div key={dep.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
                  <span className="font-bold text-white">{dep.upstreamApplication.name}</span>
                  <Icon name="arrow_forward" className="text-slate-500 text-[14px]" />
                  <span className="font-semibold text-slate-300">{dep.downstreamApplication.name}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${impactDot[dep.impactLevel]}`} />
                </div>
              ))}
              {dependencies.length > 6 && (
                <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                  +{dependencies.length - 6} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">4me mapped services</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-slate-950">{mappedCount}</p>
          <p className="mt-1 text-sm text-slate-600">Services already linked to a 4me/Xurrent service instance.</p>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Catalog suggestions</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-slate-950">{catalogSuggestedCount}</p>
          <p className="mt-1 text-sm text-slate-600">Services recognized in the synced 4me catalog.</p>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Manual only services</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-slate-950">{apps.length - mappedCount}</p>
          <p className="mt-1 text-sm text-slate-600">Still only managed from inside StatusHub.</p>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* -- Service cards -------------------------------- */}
        <div className="space-y-5">
          <Card>
            <SectionHeader icon="apps" title="Registered Services" subtitle={`${apps.length} service${apps.length !== 1 ? "s" : ""} in the catalog`} />
            <div className="grid gap-3 md:grid-cols-2">
              {apps.map((app) => (
                <div key={app.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="font-headline text-base font-extrabold text-slate-950">{app.name}</p>
                      <p className="text-xs text-slate-500">{app.ownerTeam}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusPill color={app.defaultStatus} label={app.isActive ? undefined : "inactive"} />
                      <form action={deleteApplicationAction}>
                        <input type="hidden" name="appId" value={app.id} />
                        <button
                          type="submit"
                          title="Delete service"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          <Icon name="delete" className="text-[14px]" />
                        </button>
                      </form>
                    </div>
                  </div>
                  {/* Card body */}
                  <div className="space-y-2 p-4">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">4me/Xurrent mapping</p>
                      <p className="mt-1 font-mono text-xs text-slate-700">service: <strong>{app.externalServiceMappings[0]?.externalServiceName ?? app.name}</strong></p>
                      <p className="font-mono text-xs text-slate-700">code: <strong>{app.code}</strong></p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {app.externalServiceMappings.length > 0
                          ? "Confirmed mapping from approved 4me incidents."
                          : app.externalServiceCatalogItems.length > 0
                            ? "Seen in synced 4me catalog. Confirm mapping in Automation."
                            : "No 4me mapping yet."}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status page label</p>
                      <p className="mt-1 text-xs font-bold text-slate-700">{app.statusPageLabel}</p>
                    </div>
                    {/* Dependencies */}
                    {(app.upstreamDependencies.length > 0 || app.downstreamDependencies.length > 0) && (
                      <div className="rounded-lg border border-slate-100 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Dependencies</p>
                        {app.upstreamDependencies.map((d) => (
                          <div key={d.id} className="mt-1.5 flex items-center gap-1.5 text-xs">
                            <Icon name="arrow_downward" className="text-red-400 text-[13px]" />
                            <span className="text-slate-600">Impacts <strong className="text-slate-900">{d.downstreamApplication.name}</strong> via {d.moduleName}</span>
                          </div>
                        ))}
                        {app.downstreamDependencies.map((d) => (
                          <div key={d.id} className="mt-1.5 flex items-center gap-1.5 text-xs">
                            <Icon name="arrow_upward" className="text-emerald-500 text-[13px]" />
                            <span className="text-slate-600">Depends on <strong className="text-slate-900">{d.upstreamApplication.name}</strong> for {d.integrationName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Active dependency links */}
          <Card>
            <SectionHeader icon="account_tree" title="Active Dependency Links" subtitle="Parent -> child impact relationships" />
            <div className="space-y-2">
              {dependencies.map((dep) => (
                <div key={dep.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-extrabold text-slate-900 shadow-sm border border-slate-200">
                        {dep.upstreamApplication.name}
                      </span>
                      <Icon name="arrow_forward" className="text-slate-400 text-[16px]" />
                      <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm border border-slate-200">
                        {dep.downstreamApplication.name}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{dep.moduleName} / {dep.integrationName}</p>
                    </div>
                    <StatusPill color={dep.impactLevel} label={impactLabel[dep.impactLevel]} />
                  </div>
                  <form action={deactivateApplicationDependencyAction} className="shrink-0">
                    <input type="hidden" name="dependencyId" value={dep.id} />
                    <button className="flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100">
                      <Icon name="remove_circle_outline" className="text-[14px]" />
                      Remove
                    </button>
                  </form>
                </div>
              ))}
              {!dependencies.length && (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                  <Icon name="account_tree" className="text-[32px] text-slate-300" />
                  <p className="text-sm font-bold text-slate-500">No dependency links defined</p>
                  <p className="text-xs text-slate-400">Use the form to create parent-child service relationships.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* -- Right panel ---------------------------------- */}
        <div className="space-y-5">
          {/* Add dependency */}
          <Card>
            <SectionHeader icon="add_link" title="Link Services" subtitle="Add a parent -> child dependency." />
            <form action={createApplicationDependencyAction} className="space-y-3">
              <div className="space-y-1">
                <label>Parent service (upstream)</label>
                <select name="upstreamApplicationId" className="w-full" required defaultValue="">
                  <option value="" disabled>Select parent service</option>
                  {apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label>Child service (downstream)</label>
                <select name="downstreamApplicationId" className="w-full" required defaultValue="">
                  <option value="" disabled>Select child service</option>
                  {apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label>Module name</label>
                <input name="moduleName" placeholder="e.g. Booking funnel" className="w-full" required />
              </div>
              <div className="space-y-1">
                <label>Integration name</label>
                <input name="integrationName" placeholder="e.g. Website booking widget" className="w-full" required />
              </div>
              <div className="space-y-1">
                <label>Impact description</label>
                <textarea name="impactDescription" placeholder="Customers may not complete reservations from the public website." className="min-h-[72px] w-full resize-none" required />
              </div>
              <div className="space-y-1">
                <label>Impact level when parent is down</label>
                <select name="impactLevel" className="w-full" defaultValue="yellow">
                  <option value="red">Major Outage (Red)</option>
                  <option value="yellow">Degraded (Yellow)</option>
                  <option value="blue">Maintenance (Blue)</option>
                  <option value="green">Informational (Green)</option>
                </select>
              </div>
              <SubmitButton>Create dependency link</SubmitButton>
            </form>
          </Card>

          {/* Status page order */}
          <Card>
            <SectionHeader icon="sort" title="Status Page Order" subtitle="Drag services into display order." />
            <StatusPageOrderEditor
              services={apps.map((a) => ({ id: a.id, name: a.statusPageLabel, ownerTeam: a.ownerTeam }))}
            />
          </Card>

          {/* New service form */}
          <Card>
            <SectionHeader icon="add_circle" title="Register New Service" subtitle="Add a service to the catalog." />
            <form action={createApplicationAction} className="space-y-3">
              <div className="space-y-1">
                <label>Service name</label>
                <input name="name" placeholder="Website" className="w-full" required />
              </div>
              <div className="space-y-1">
                <label>Service code (alphanumeric)</label>
                <input name="code" placeholder="WEB" className="w-full" required />
              </div>
              <div className="space-y-1">
                <label>Owner team</label>
                <input name="ownerTeam" placeholder="Web Platform" className="w-full" required />
              </div>
              <div className="space-y-1">
                <label>Status page label</label>
                <input name="statusPageLabel" placeholder="Website" className="w-full" required />
              </div>
              <div className="space-y-1">
                <label>Default status</label>
                <select name="defaultStatus" className="w-full" defaultValue="green">
                  <option value="green">Operational (Green)</option>
                  <option value="yellow">Degraded (Yellow)</option>
                  <option value="red">Outage (Red)</option>
                  <option value="blue">Maintenance (Blue)</option>
                </select>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold normal-case tracking-normal text-slate-700">
                <input type="checkbox" name="isActive" defaultChecked />
                Mark as active
              </label>
              <SubmitButton>Register service</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
