import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Card, EmptyState, FormNotice, PageHeader, SectionHeader, StageBadge, StatusPill, SubmitButton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { createManualIncidentAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { elapsedSince } from "@/lib/utils";
import type { StatusColor } from "@prisma/client";

export const dynamic = "force-dynamic";

const colorBarMap: Record<StatusColor, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-sky-500"
};

const PAGE_SIZE = 20;

export default async function IncidentsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; q?: string; page?: string; status?: string }>
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const statusFilter = params.status ?? "open";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const [open, closedResult, totalClosed, applications] = await Promise.all([
    prisma.incident.findMany({
      where: { isOpen: true },
      include: { application: true, incidentType: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.incident.findMany({
      where: {
        isOpen: false,
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { summary: { contains: query, mode: "insensitive" } },
                { application: { name: { contains: query, mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: { application: true, incidentType: true },
      orderBy: { resolvedAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE
    }),
    prisma.incident.count({
      where: {
        isOpen: false,
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { summary: { contains: query, mode: "insensitive" } },
                { application: { name: { contains: query, mode: "insensitive" } } }
              ]
            }
          : {})
      }
    }),
    prisma.application.findMany({
      where: { isActive: true },
      orderBy: [{ statusPageOrder: "asc" }, { name: "asc" }]
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(totalClosed / PAGE_SIZE));

  return (
    <Shell title="Incidents">
      <PageHeader
        eyebrow="Incident Operations"
        title="Declare and communicate service impact"
        description="Select a service, choose the impact, and let StatusHub update the status page and notify the right recipients with approved templates."
      />
      <FormNotice error={params.error} />

      {/* Declare form */}
      <Card className="mb-5">
        <SectionHeader
          icon="campaign"
          title="Declare Incident"
          subtitle="Use this for manual cases when monitoring or Xurrent has not created the incident."
        />
        <form action={createManualIncidentAction} className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr]">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Service</label>
            <select name="applicationId" className="w-full" required defaultValue="">
              <option value="" disabled>Select service</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>{app.statusPageLabel}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Type</label>
            <select name="scenario" className="w-full" required defaultValue="outage">
              <option value="outage">Service disruption</option>
              <option value="performance">Performance issue</option>
              <option value="maintenance">Planned maintenance</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Severity</label>
            <select name="impact" className="w-full" required defaultValue="red">
              <option value="red">Major outage - service unavailable</option>
              <option value="yellow">Degraded - partial impact</option>
              <option value="blue">Maintenance - planned work</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Next update</label>
            <select name="nextUpdateMinutes" className="w-full" defaultValue="30">
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
              <option value="120">2 hours</option>
            </select>
          </div>
          <div className="space-y-1 lg:col-span-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Customer-facing summary</label>
            <input
              name="summary"
              className="w-full"
              placeholder="Customers are unable to complete checkout from the public website."
            />
          </div>
          <div className="flex items-end">
            <SubmitButton>Declare incident</SubmitButton>
          </div>
        </form>
        <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 md:grid-cols-3">
          <p><strong className="text-slate-800">Status page:</strong> updated immediately.</p>
          <p><strong className="text-slate-800">Email:</strong> sent via approved template.</p>
          <p><strong className="text-slate-800">Timeline:</strong> every action is audited.</p>
        </div>
      </Card>

      {/* Active incidents */}
      <div className="mb-5 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-extrabold text-red-700">
              {open.length}
            </span>
            Active Incidents
          </h3>
          {open.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-600">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 pulse-dot" />
              Requires attention
            </span>
          )}
        </div>

        {open.length ? (
          <div className="space-y-2">
            {open.map((incident) => (
              <Link
                key={incident.id}
                href={`/incidents/${incident.id}`}
                className="group flex items-start gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-card-hover"
              >
                <div className={`w-1 shrink-0 self-stretch ${colorBarMap[incident.currentColor]}`} />
                <div className="flex flex-1 items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-950">{incident.title}</p>
                      <StageBadge stage={incident.currentStage} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {incident.application.name} - {incident.incidentType.name}
                      {incident.xurrentRequestId && !incident.xurrentRequestId.startsWith("MANUAL") ? ` - 4me: ${incident.xurrentRequestId}` : ""}
                    </p>
                    <p className="mt-2 line-clamp-1 text-xs leading-5 text-slate-600">{incident.summary}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusPill color={incident.currentColor} pulse />
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Icon name="schedule" className="text-[12px]" />
                      {elapsedSince(incident.updatedAt)} ago
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState icon="check_circle" text="No active incidents" sub="The system is quiet. Open incidents will appear here when created by 4me/Xurrent webhooks or declared manually." />
          </Card>
        )}
      </div>

      {/* Closed incidents with search */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SectionHeader icon="history" title="Incident History" subtitle={`${totalClosed} resolved incident${totalClosed !== 1 ? "s" : ""}`} />
          <form method="GET" className="flex items-center gap-2">
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-slate-400" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Search incidents..."
                className="w-56 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
              />
            </div>
            {query && (
              <Link href="/incidents" className="text-xs font-bold text-slate-500 hover:text-slate-700">
                Clear
              </Link>
            )}
          </form>
        </div>

        <div className="space-y-2">
          {closedResult.map((incident) => (
            <Link
              key={incident.id}
              href={`/incidents/${incident.id}`}
              className="flex items-start justify-between gap-3 rounded-xl border border-transparent bg-slate-50 p-4 transition hover:border-slate-200 hover:bg-white hover:shadow-card"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-700">{incident.title}</p>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    Resolved
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {incident.application.name} - {incident.incidentType.name}
                  {incident.xurrentRequestId && !incident.xurrentRequestId.startsWith("MANUAL") ? ` - ${incident.xurrentRequestId}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <StatusPill color="green" />
                <span className="text-[10px] text-slate-400">
                  {incident.resolvedAt ? incident.resolvedAt.toLocaleDateString() : "-"}
                </span>
              </div>
            </Link>
          ))}
          {!closedResult.length && (
            <EmptyState
              icon="history"
              text={query ? `No incidents matching "${query}"` : "No resolved incidents yet."}
              sub={query ? "Try a different search term." : undefined}
            />
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages} - {totalClosed} total
            </span>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={`/incidents?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page - 1) })}`}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <Icon name="arrow_back" className="text-[14px]" />
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/incidents?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page + 1) })}`}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Next
                  <Icon name="arrow_forward" className="text-[14px]" />
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </Shell>
  );
}
