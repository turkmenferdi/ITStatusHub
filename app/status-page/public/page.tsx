import type { Metadata } from "next";
import { statusSummary } from "@/lib/incidents";
import { buildServiceImpacts } from "@/lib/service-impact";
import { buildUptimeMap } from "@/lib/uptime";
import { overallColor, colorLabelMap } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import type { StatusColor } from "@prisma/client";
import { Icon } from "@/components/Icon";
import { SubscribeForm as SubscribeFormInline } from "@/components/SubscribeForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "System Status - StatusHub",
  description: "Live availability status for all business services."
};

type PublicStatusData = {
  summary: Awaited<ReturnType<typeof statusSummary>>;
  dependencies: Awaited<ReturnType<typeof prisma.applicationDependency.findMany>>;
  openIncidents: Awaited<ReturnType<typeof prisma.incident.findMany>>;
  uptimeMap: Awaited<ReturnType<typeof buildUptimeMap>>;
  error?: string | null;
};

const colorCss: Record<StatusColor, { dot: string; bar: string; badge: string; headerBg: string; sub: string }> = {
  green:  { dot: "bg-emerald-500", bar: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", headerBg: "bg-emerald-600", sub: "No known issues" },
  yellow: { dot: "bg-amber-500",   bar: "bg-amber-400",   badge: "bg-amber-50 text-amber-800 border-amber-200",       headerBg: "bg-amber-500",  sub: "Partial service impairment" },
  red:    { dot: "bg-red-500",     bar: "bg-red-400",     badge: "bg-red-50 text-red-800 border-red-200",             headerBg: "bg-red-600",    sub: "Service is unavailable" },
  blue:   { dot: "bg-sky-500",     bar: "bg-sky-400",     badge: "bg-sky-50 text-sky-800 border-sky-200",             headerBg: "bg-sky-600",    sub: "Scheduled maintenance" }
};

function UptimeBars({ bars, compact = false }: { bars: Array<{ color: StatusColor }>; compact?: boolean }) {
  return (
    <div
      className={`grid gap-[2px] ${compact ? "grid-cols-[repeat(45,minmax(2px,1fr))]" : "grid-cols-[repeat(45,minmax(2px,1fr))] md:grid-cols-[repeat(90,minmax(2px,1fr))]"}`}
      aria-label="90 day availability history"
    >
      {bars.map((bar, i) => (
        <span
          key={i}
          className={`rounded-[1px] ${compact ? "h-4" : "h-6"} ${colorCss[bar.color].bar} transition-opacity hover:opacity-70`}
          title={`${colorLabelMap[bar.color]}`}
        />
      ))}
    </div>
  );
}

async function loadPublicStatusData(): Promise<PublicStatusData> {
  try {
    const [summary, dependencies, openIncidents, uptimeMap] = await Promise.all([
      statusSummary(),
      prisma.applicationDependency.findMany({
        where: { isActive: true },
        include: { upstreamApplication: true, downstreamApplication: true },
        orderBy: { createdAt: "asc" }
      }),
      prisma.incident.findMany({
        where: { isOpen: true },
        include: { application: true, incidentType: true },
        orderBy: { startedAt: "desc" }
      }),
      buildUptimeMap(90)
    ]);

    return { summary, dependencies, openIncidents, uptimeMap, error: null };
  } catch (error) {
    console.error("[PUBLIC STATUS PAGE]", error);
    return {
      summary: [],
      dependencies: [],
      openIncidents: [],
      uptimeMap: new Map(),
      error: error instanceof Error ? error.message : "Status data could not be loaded."
    };
  }
}

export default async function PublicStatusPage() {
  const { summary, dependencies, openIncidents, uptimeMap, error } = await loadPublicStatusData();

  const activeIssues = summary.filter((s) => s.color !== "green");
  const serviceImpacts = buildServiceImpacts(summary, dependencies);
  const impactsBySource = new Map<string, typeof serviceImpacts>();
  for (const impact of serviceImpacts) {
    const list = impactsBySource.get(impact.dependency.upstreamApplicationId) ?? [];
    impactsBySource.set(impact.dependency.upstreamApplicationId, [...list, impact]);
  }

  const overall = overallColor(activeIssues.map((s) => s.color));
  const overallMessage =
    overall === "green"
      ? "All systems are fully operational."
      : `${activeIssues.length} service${activeIssues.length > 1 ? "s" : ""} ${activeIssues.length > 1 ? "are" : "is"} currently impacted.`;

  const now = new Date();

  return (
    <main className="min-h-screen bg-slate-950 px-4 pb-16 text-slate-950">
      <div className="mx-auto max-w-3xl pt-10">
        {/* Brand header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-900/30">
              <Icon name="wifi_tethering" className="text-[20px] text-white" />
            </div>
            <div>
              <h1 className="font-headline text-xl font-extrabold text-white">StatusHub</h1>
              <p className="text-xs font-semibold text-slate-400">Service Status</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Updated {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Overall status banner */}
        <div className={`mb-6 overflow-hidden rounded-2xl ${colorCss[overall].headerBg} shadow-xl`}>
          <div className="px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Icon
                  name={overall === "green" ? "check_circle" : overall === "red" ? "cancel" : "warning"}
                  className="text-[22px] text-white"
                />
              </div>
              <div>
                <p className="font-headline text-xl font-extrabold text-white">{colorLabelMap[overall]}</p>
                <p className="text-sm text-white/75">{overallMessage}</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-950/30 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Status setup needs attention</p>
            <p className="mt-2 text-sm leading-6 text-amber-100">
              Public status data could not be loaded yet. This usually means the production database, migrations, or seed data are not ready.
            </p>
          </div>
        )}

        {!summary.length && !error && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <p className="text-sm font-extrabold text-white">No services published yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Add and seed services in StatusHub to populate the public status experience.
            </p>
          </div>
        )}

        {/* Active incident notices */}
        {openIncidents.length > 0 && (
          <div className="mb-6 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Active Incidents</h2>
            {openIncidents.map((incident) => (
              <div key={incident.id} className="rounded-2xl border border-red-500/20 bg-red-950/30 p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-400 pulse-dot" />
                  <div>
                    <p className="font-bold text-white">{incident.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      {incident.incidentType.name} affecting {incident.application.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Started {incident.startedAt.toLocaleString()} - IT teams are actively responding
                    </p>
                    {incident.summary && (
                      <p className="mt-2 text-sm text-slate-300">{incident.summary}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Service list */}
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/5 backdrop-blur">
          <div className="border-b border-white/5 px-5 py-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-slate-400">
              <span>Service</span>
              <span>Past 90 days</span>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {summary.map((item) => {
              const childImpacts = impactsBySource.get(item.app.id) ?? [];
              const uptime = uptimeMap.get(item.app.id);

              return (
                <div key={item.app.id} className="px-5 py-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${colorCss[item.color].dot} ${item.color !== "green" ? "pulse-dot" : ""}`}
                      />
                      <h2 className="font-headline text-base font-extrabold text-white">{item.app.statusPageLabel}</h2>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${colorCss[item.color].badge}`}>
                      {colorLabelMap[item.color]}
                    </span>
                  </div>

                  {uptime ? (
                    <UptimeBars bars={uptime.bars} />
                  ) : (
                    <div className="h-6 rounded bg-white/5" />
                  )}

                  <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    <span>90 days ago</span>
                    <span>
                      {uptime ? `${uptime.uptimePct}% uptime` : item.color !== "green" ? item.message : "Monitoring active"}
                    </span>
                    <span>Today</span>
                  </div>

                  {childImpacts.length > 0 && item.color !== "green" && (
                    <details className="status-dependencies mt-4 border-t border-white/5 pt-4">
                      <summary className="flex cursor-pointer items-center justify-between gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-400 transition">
                        <span>Affected dependent services ({childImpacts.length})</span>
                        <span
                          className="collapse-icon flex h-6 w-6 items-center justify-center rounded-md border border-white/10 text-slate-400"
                          aria-hidden
                        />
                      </summary>
                      <div className="mt-3 space-y-4 pl-4">
                        {childImpacts.map((impact) => {
                          const depUptime = uptimeMap.get(impact.dependency.downstreamApplicationId);
                          return (
                            <div key={impact.dependency.id}>
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`h-2 w-2 rounded-full ${colorCss[impact.effectiveColor].dot}`} />
                                  <span className="text-sm font-bold text-slate-200">
                                    {impact.dependency.downstreamApplication.statusPageLabel}
                                  </span>
                                  <span className="text-[10px] text-slate-500">{impact.dependency.moduleName}</span>
                                </div>
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${colorCss[impact.effectiveColor].badge}`}>
                                  {colorLabelMap[impact.effectiveColor]}
                                </span>
                              </div>
                              {depUptime ? (
                                <UptimeBars bars={depUptime.bars} compact />
                              ) : (
                                <div className="h-4 rounded bg-white/5" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscribe section */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-800/60 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20">
              <Icon name="notifications" className="text-emerald-400 text-[20px]" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-white">Stay Informed</p>
              <p className="text-xs text-slate-400">Get email updates when service status changes.</p>
            </div>
          </div>
          <SubscribeFormInline />
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-slate-600">
            This page refreshes automatically every minute. Last updated {now.toLocaleString()}.
          </p>
          <p className="text-xs text-slate-700">
            Powered by <strong className="text-slate-500">StatusHub</strong> - For urgent issues, contact your IT service desk.
          </p>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: "setTimeout(()=>window.location.reload(),60000)" }} />
    </main>
  );
}
