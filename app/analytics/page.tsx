import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Card, EmptyState, HorizontalBar, MetricCard, PageHeader, SectionHeader, TrendPill } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatMttr(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function elapsedSince(date: Date): string {
  const ms = Date.now() - date.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function AnalyticsPage() {
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const thirtyDaysAgo  = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo   = new Date(now - 60 * 24 * 60 * 60 * 1000);
  const eightWeeksAgo  = new Date(now - 56 * 24 * 60 * 60 * 1000);

  const [
    totalCount,
    resolvedIncidents,
    emailStats,
    thisMonthIncidents,
    prevMonthCount,
    weeklyRaw
  ] = await Promise.all([
    prisma.incident.count(),
    prisma.incident.findMany({
      where: { isOpen: false, resolvedAt: { not: null } },
      include: { application: true, incidentType: true },
      orderBy: { resolvedAt: "desc" },
      take: 50
    }),
    prisma.incidentNotification.groupBy({
      by: ["deliveryStatus"],
      _count: { id: true }
    }),
    prisma.incident.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      include: { application: true, incidentType: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.incident.count({
      where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }
    }),
    prisma.incident.findMany({
      where: { createdAt: { gte: eightWeeksAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" }
    })
  ]);

  /* -- MTTR -------------------------------------------------- */
  const withTime = resolvedIncidents.filter(i => i.resolvedAt !== null);
  const mttrMs = withTime.length > 0
    ? withTime.reduce((s, i) => s + (i.resolvedAt!.getTime() - i.startedAt.getTime()), 0) / withTime.length
    : null;

  /* -- This-month trend -------------------------------------- */
  const thisMonthCount = thisMonthIncidents.length;
  const trendPct = prevMonthCount > 0
    ? Math.round(((thisMonthCount - prevMonthCount) / prevMonthCount) * 100)
    : null;

  /* -- Email stats ------------------------------------------- */
  const totalEmails   = emailStats.reduce((s, x) => s + x._count.id, 0);
  const sentEmails    = emailStats.find(x => x.deliveryStatus === "sent")?._count.id ?? 0;
  const failedEmails  = emailStats.find(x => x.deliveryStatus === "failed")?._count.id ?? 0;
  const simEmails     = emailStats.find(x => x.deliveryStatus === "simulated")?._count.id ?? 0;
  const successRate   = totalEmails > 0 ? Math.round((sentEmails / totalEmails) * 100) : null;

  /* -- Incidents by service ---------------------------------- */
  const allForCharts = [...resolvedIncidents, ...thisMonthIncidents];
  const seen = new Set<string>();
  const uniqueIncidents = allForCharts.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; });

  const byService: Record<string, { name: string; count: number }> = {};
  for (const i of uniqueIncidents) {
    if (!byService[i.applicationId]) byService[i.applicationId] = { name: i.application.name, count: 0 };
    byService[i.applicationId].count++;
  }
  const topServices = Object.values(byService).sort((a, b) => b.count - a.count).slice(0, 8);
  const maxSvc = topServices[0]?.count || 1;

  /* -- Incidents by type ------------------------------------- */
  const byType: Record<string, { name: string; count: number }> = {};
  for (const i of uniqueIncidents) {
    if (!byType[i.incidentTypeId]) byType[i.incidentTypeId] = { name: i.incidentType.name, count: 0 };
    byType[i.incidentTypeId].count++;
  }
  const topTypes = Object.values(byType).sort((a, b) => b.count - a.count).slice(0, 6);
  const maxType = topTypes[0]?.count || 1;

  /* -- MTTR by type ------------------------------------------ */
  const mttrMap: Record<string, { name: string; sum: number; count: number }> = {};
  for (const i of withTime) {
    if (!mttrMap[i.incidentTypeId]) mttrMap[i.incidentTypeId] = { name: i.incidentType.name, sum: 0, count: 0 };
    mttrMap[i.incidentTypeId].sum  += i.resolvedAt!.getTime() - i.startedAt.getTime();
    mttrMap[i.incidentTypeId].count++;
  }
  const mttrByType = Object.values(mttrMap)
    .map(t => ({ name: t.name, avg: t.sum / t.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);
  const maxMttr = mttrByType[0]?.avg || 1;

  /* -- 8-week buckets ---------------------------------------- */
  const buckets: number[] = Array(8).fill(0);
  for (const i of weeklyRaw) {
    const w = Math.floor((now - i.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (w < 8) buckets[7 - w]++;
  }
  const maxBucket = Math.max(...buckets, 1);

  return (
    <Shell title="Analytics">
      <PageHeader
        eyebrow="Performance & Reliability"
        title="Analytics"
        description="Mean time to resolve, incident trends, service reliability, and communication effectiveness - all in one view."
      />

      {/* -- KPI Row ------------------------------------------- */}
      <section className="mb-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard
          label="Mean Time to Resolve"
          value={mttrMs !== null ? formatMttr(mttrMs) : "-"}
          detail={withTime.length > 0 ? `Based on ${withTime.length} resolved incident${withTime.length !== 1 ? "s" : ""}` : "No resolved incidents yet"}
          icon="timer"
          accent="sky"
        />
        <MetricCard
          label="Total Incidents"
          value={totalCount}
          detail="All services, all time."
          icon="notifications_active"
          accent={totalCount > 0 ? "amber" : "emerald"}
        />
        <MetricCard
          label="Last 30 Days"
          value={thisMonthCount}
          detail={trendPct !== null ? `${trendPct > 0 ? "+" : ""}${trendPct}% vs prior period` : "No prior period data"}
          icon={trendPct !== null && trendPct > 0 ? "trending_up" : trendPct !== null && trendPct < 0 ? "trending_down" : "bar_chart_4_bars"}
          accent={trendPct !== null && trendPct > 0 ? "red" : "emerald"}
        />
        <MetricCard
          label="Email Success Rate"
          value={successRate !== null ? `${successRate}%` : "-"}
          detail={totalEmails > 0 ? `${sentEmails} sent - ${failedEmails} failed - ${simEmails} dev` : "No emails sent yet"}
          icon="outgoing_mail"
          accent={successRate !== null ? (successRate >= 90 ? "emerald" : successRate >= 70 ? "amber" : "red") : "emerald"}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">

        {/* -- Incidents by service --------------------------- */}
        <Card>
          <SectionHeader icon="apps" title="Incidents by Service" subtitle="All time - top services by incident volume." />
          {topServices.length > 0 ? (
            <div className="space-y-3">
              {topServices.map(s => (
                <HorizontalBar key={s.name} label={s.name} count={s.count} max={maxSvc} />
              ))}
            </div>
          ) : (
            <EmptyState icon="apps" text="No incident data yet." sub="Incidents will appear here as they are created." />
          )}
        </Card>

        {/* -- 8-week trend ----------------------------------- */}
        <Card>
          <SectionHeader icon="analytics" title="8-Week Incident Trend" subtitle="Weekly incident volume over the past 2 months." />
          {weeklyRaw.length > 0 ? (
            <div className="flex items-end gap-1.5 h-36 pt-2">
              {buckets.map((count, i) => {
                const pct = Math.round((count / maxBucket) * 100);
                const isCurrent = i === 7;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-500">{count > 0 ? count : ""}</span>
                    <div className="relative w-full flex-1">
                      <div className="absolute inset-0 rounded-t-sm bg-slate-100" />
                      <div
                        className={`absolute bottom-0 w-full rounded-t-sm transition-all ${isCurrent ? "bg-emerald-500" : "bg-cyan-400"}`}
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400">{isCurrent ? "Now" : `W${i + 1}`}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="bar_chart_4_bars" text="No trend data yet." sub="Incident trend will appear after your first incidents." />
          )}
        </Card>

        {/* -- Incidents by type ------------------------------ */}
        <Card>
          <SectionHeader icon="warning" title="Incidents by Type" subtitle="Volume breakdown per incident classification." />
          {topTypes.length > 0 ? (
            <div className="space-y-3">
              {topTypes.map(t => (
                <HorizontalBar key={t.name} label={t.name} count={t.count} max={maxType}
                  colorClass="bg-gradient-to-r from-amber-400 to-amber-500" />
              ))}
            </div>
          ) : (
            <EmptyState icon="warning" text="No incident type data yet." />
          )}
        </Card>

        {/* -- MTTR by type ----------------------------------- */}
        <Card>
          <SectionHeader icon="timer" title="MTTR by Incident Type" subtitle="Average time-to-resolve per classification." />
          {mttrByType.length > 0 ? (
            <div className="space-y-3">
              {mttrByType.map(t => (
                <HorizontalBar key={t.name} label={t.name} count={t.avg} max={maxMttr}
                  colorClass="bg-gradient-to-r from-rose-400 to-red-500"
                  suffix={formatMttr(t.avg)} />
              ))}
            </div>
          ) : (
            <EmptyState icon="timer" text="No resolved incidents yet." sub="MTTR by type appears once incidents are resolved." />
          )}
        </Card>
      </div>

      {/* -- Email delivery breakdown --------------------------- */}
      {totalEmails > 0 && (
        <Card className="mt-5">
          <SectionHeader icon="outgoing_mail" title="Email Delivery Breakdown" subtitle={`${totalEmails} total notification${totalEmails !== 1 ? "s" : ""} dispatched`} />
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Sent via SMTP",   count: sentEmails,   color: "emerald", border: "border-emerald-100 bg-emerald-50", text: "text-emerald-900", bar: "bg-emerald-500", barBg: "bg-emerald-200", caption: "text-emerald-700" },
              { label: "Dev / Simulated", count: simEmails,    color: "amber",   border: "border-amber-100 bg-amber-50",     text: "text-amber-900",   bar: "bg-amber-500",   barBg: "bg-amber-200",   caption: "text-amber-700" },
              { label: "Failed",          count: failedEmails, color: "red",     border: "border-red-100 bg-red-50",         text: "text-red-900",     bar: "bg-red-500",     barBg: "bg-red-200",     caption: "text-red-700" }
            ].map(stat => {
              const pct = totalEmails > 0 ? Math.round((stat.count / totalEmails) * 100) : 0;
              return (
                <div key={stat.label} className={`rounded-xl border p-4 ${stat.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${stat.bar}`} />
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${stat.caption}`}>{stat.label}</p>
                  </div>
                  <p className={`font-headline text-3xl font-extrabold ${stat.text}`}>{stat.count}</p>
                  <div className={`mt-2 h-2 rounded-full ${stat.barBg}`}>
                    <div className={`h-2 rounded-full ${stat.bar} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className={`mt-1 text-xs ${stat.caption}`}>{pct}% of total</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* -- Trend comparison pill row --------------------------- */}
      {trendPct !== null && (
        <div className="mt-5 rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">30-Day Comparison</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                <span className="font-extrabold text-slate-950">{thisMonthCount}</span> incidents this period vs{" "}
                <span className="font-extrabold text-slate-950">{prevMonthCount}</span> in the prior period.
              </p>
            </div>
            <TrendPill value={trendPct} />
            <Link href="/incidents" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
              <Icon name="open_in_new" className="text-[14px]" />
              View all incidents
            </Link>
          </div>
        </div>
      )}

      {/* -- Recent resolved with MTTR --------------------------- */}
      {withTime.length > 0 && (
        <Card className="mt-5">
          <SectionHeader icon="history" title="Recently Resolved" subtitle="Individual MTTR per incident." />
          <div className="space-y-2">
            {withTime.slice(0, 8).map(inc => {
              const mttr = inc.resolvedAt!.getTime() - inc.startedAt.getTime();
              return (
                <Link
                  key={inc.id}
                  href={`/incidents/${inc.id}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 transition hover:border-cyan-200 hover:bg-cyan-50/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900 group-hover:text-cyan-900">{inc.title}</p>
                    <p className="text-xs text-slate-500">{inc.application.name} - {inc.incidentType.name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">{formatMttr(mttr)}</span>
                    <p className="mt-1 text-[10px] text-slate-400">{inc.resolvedAt ? elapsedSince(inc.resolvedAt) : ""}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </Shell>
  );
}
