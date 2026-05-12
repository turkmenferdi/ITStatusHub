import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Card, PageHeader, SectionHeader, StatusPill, TextLinkButton, activityToneClasses } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { statusSummary } from "@/lib/incidents";
import { prisma } from "@/lib/prisma";
import { activityPresentation } from "@/lib/activity";
import { buildServiceImpacts } from "@/lib/service-impact";
import { buildUptimeMap } from "@/lib/uptime";
import { overallColor, colorLabelMap } from "@/lib/utils";
import type { StatusColor } from "@prisma/client";

export const dynamic = "force-dynamic";

const colorBarCss: Record<StatusColor, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
  blue: "bg-sky-500"
};

const colorTextCss: Record<StatusColor, string> = {
  green: "text-emerald-700",
  yellow: "text-amber-700",
  red: "text-red-700",
  blue: "text-sky-700"
};

const colorBadgeCss: Record<StatusColor, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-50 text-amber-800 border-amber-200",
  red: "bg-red-50 text-red-800 border-red-200",
  blue: "bg-sky-50 text-sky-800 border-sky-200"
};

const overallBannerCss: Record<StatusColor, string> = {
  green: "bg-emerald-600",
  yellow: "bg-amber-500",
  red: "bg-red-600",
  blue: "bg-sky-600"
};

function UptimeBars({ bars, compact = false }: { bars: Array<{ color: StatusColor }>; compact?: boolean }) {
  return (
    <div
      className={`grid gap-[2px] ${compact ? "grid-cols-[repeat(45,minmax(2px,1fr))]" : "grid-cols-[repeat(45,minmax(2px,1fr))] md:grid-cols-[repeat(90,minmax(2px,1fr))]"}`}
      aria-label="90 day status"
    >
      {bars.map((bar, i) => (
        <span
          key={i}
          className={`${compact ? "h-4" : "h-7"} rounded-[2px] ${colorBarCss[bar.color]} opacity-90 hover:opacity-100 transition-opacity`}
        />
      ))}
    </div>
  );
}

export default async function StatusPageView() {
  const [summary, audit, dependencies, openIncidents, uptimeMap] = await Promise.all([
    statusSummary(),
    prisma.auditLog.findMany({ where: { entityType: "Incident" }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.applicationDependency.findMany({
      where: { isActive: true },
      include: { upstreamApplication: true, downstreamApplication: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.incident.findMany({
      where: { isOpen: true },
      include: { application: true, incidentType: true },
      orderBy: { startedAt: "desc" },
      take: 5
    }),
    buildUptimeMap(90)
  ]);

  const activeIssues = summary.filter((s) => s.color !== "green");
  const serviceImpacts = buildServiceImpacts(summary, dependencies);
  const impactsBySource = new Map<string, typeof serviceImpacts>();
  for (const impact of serviceImpacts) {
    const list = impactsBySource.get(impact.dependency.upstreamApplicationId) ?? [];
    impactsBySource.set(impact.dependency.upstreamApplicationId, [...list, impact]);
  }

  const overall = overallColor(activeIssues.map((s) => s.color));
  const overallText =
    overall === "green"
      ? "All Systems Operational"
      : `${activeIssues.length} Service${activeIssues.length > 1 ? "s" : ""} Require Attention`;

  return (
    <Shell title="Status Page">
      <PageHeader
        eyebrow="Live Status"
        title="System Health Overview"
        description="Real-time operational view of all services, uptime history, and incident activity."
      />

      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-cyan-100 bg-cyan-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Icon name="visibility" className="mt-0.5 shrink-0 text-cyan-600" />
          <div>
            <p className="text-sm font-extrabold text-cyan-900">Operator view - includes incident context and audit detail</p>
            <p className="mt-0.5 text-xs text-cyan-700">The public-facing page shows simplified status without internal details.</p>
          </div>
        </div>
        <TextLinkButton href="/status-page/public" icon="open_in_new">Open public status</TextLinkButton>
      </div>

      <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-950 px-5 py-4">
          <div className="flex items-center gap-3">
            <Icon name="wifi_tethering" className="text-emerald-400 text-[22px]" />
            <span className="font-headline text-lg font-extrabold text-white">StatusHub</span>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Updated {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className={`flex items-center gap-3 px-5 py-4 text-white ${overallBannerCss[overall]}`}>
          <Icon name={overall === "green" ? "check_circle" : overall === "red" ? "cancel" : "warning"} className="text-[22px]" />
          <div>
            <p className="font-bold">{overallText}</p>
            <p className="text-sm text-white/75">
              {openIncidents.length > 0
                ? `${openIncidents.length} active incident${openIncidents.length > 1 ? "s" : ""} in progress`
                : "No active incidents"}
            </p>
          </div>
        </div>
      </div>

      {openIncidents.length > 0 && (
        <div className="mb-5 space-y-2">
          {openIncidents.map((incident) => (
            <Link
              key={incident.id}
              href={`/incidents/${incident.id}`}
              className="flex items-start gap-4 rounded-xl border border-red-200 bg-red-50 p-4 transition hover:border-red-300 hover:shadow-card"
            >
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100">
                <Icon name="warning" className="text-red-600 text-[16px]" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-red-900">{incident.title}</p>
                <p className="mt-0.5 text-xs text-red-700">
                  {incident.application.name} - {incident.incidentType.name} - Started{" "}
                  {incident.startedAt.toLocaleString()}
                </p>
              </div>
              <span className="shrink-0 text-xs font-bold text-red-600 flex items-center gap-1">
                Manage <Icon name="arrow_forward" className="text-[14px]" />
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1 text-xs font-bold uppercase tracking-widest text-slate-400">
            <span>Services - 90-day uptime</span>
            <span>
              {summary.filter((s) => s.color === "green").length} / {summary.length} operational
            </span>
          </div>

          {summary.map((item) => {
            const childImpacts = impactsBySource.get(item.app.id) ?? [];
            const uptime = uptimeMap.get(item.app.id);
            const pctLabel = uptime ? `${uptime.uptimePct}%` : "-";

            return (
              <section key={item.app.id} className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-headline text-base font-extrabold text-slate-950">{item.app.statusPageLabel}</h3>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.message}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${colorTextCss[item.color]}`}>{colorLabelMap[item.color]}</span>
                    <StatusPill color={item.color} pulse={item.color !== "green"} />
                  </div>
                </div>

                {uptime ? (
                  <UptimeBars bars={uptime.bars} />
                ) : (
                  <div className="h-7 rounded bg-slate-100" />
                )}

                <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  <span>90 days ago</span>
                  <span>{pctLabel} uptime</span>
                  <span>Today</span>
                </div>

                {childImpacts.length > 0 && (
                  <details className="status-dependencies mt-4 border-t border-slate-100 pt-3" open={item.color !== "green"}>
                    <summary className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-1 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 transition hover:bg-slate-50">
                      <span>Affected dependencies ({childImpacts.length})</span>
                      <span className="collapse-icon flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm" aria-hidden />
                    </summary>
                    <div className="mt-3 space-y-4 pl-4">
                      {childImpacts.map((impact) => {
                        const depUptime = uptimeMap.get(impact.dependency.downstreamApplicationId);
                        return (
                          <div key={impact.dependency.id}>
                            <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                              <div>
                                <h4 className="text-sm font-extrabold text-slate-900">
                                  {impact.dependency.downstreamApplication.statusPageLabel}
                                </h4>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  {impact.dependency.moduleName} / {impact.dependency.integrationName}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${colorTextCss[impact.effectiveColor]}`}>
                                  {colorLabelMap[impact.effectiveColor]}
                                </span>
                                <StatusPill color={impact.effectiveColor} />
                              </div>
                            </div>
                            {depUptime ? (
                              <UptimeBars bars={depUptime.bars} compact />
                            ) : (
                              <div className="h-4 rounded bg-slate-100" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
              </section>
            );
          })}
        </section>

        <aside className="space-y-5">
          <Card>
            <SectionHeader icon="bar_chart_4_bars" title="Current State" />
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <p className="font-headline text-2xl font-extrabold text-emerald-700">
                  {summary.length - activeIssues.length}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 mt-1">Operational</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${activeIssues.length ? "bg-red-50" : "bg-slate-50"}`}>
                <p className={`font-headline text-2xl font-extrabold ${activeIssues.length ? "text-red-700" : "text-slate-400"}`}>
                  {activeIssues.length}
                </p>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${activeIssues.length ? "text-red-800" : "text-slate-500"}`}>
                  Impacted
                </p>
              </div>
            </div>
            {activeIssues.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {activeIssues.map((s) => (
                  <div key={s.app.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="text-xs font-bold text-slate-800">{s.app.name}</span>
                    <StatusPill color={s.color} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader icon="history" title="Incident Activity" />
            <div className="space-y-2">
              {audit.map((item) => {
                const activity = activityPresentation(item);
                return (
                  <div key={item.id} className={`rounded-xl border p-3 ${activityToneClasses(activity.tone)}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">{activity.title}</span>
                      <span className="shrink-0 text-[10px] text-slate-400">{item.createdAt.toLocaleTimeString()}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{activity.detail}</p>
                  </div>
                );
              })}
              {!audit.length && <p className="text-sm text-slate-500">No incident activity yet.</p>}
            </div>
          </Card>
        </aside>
      </div>
    </Shell>
  );
}
