import { Shell } from "@/components/Shell";
import { Card, EmptyState, PageHeader, SectionHeader, SubscriberCount } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  const [subscribers, total] = await Promise.all([
    prisma.statusPageSubscriber.findMany({
      orderBy: { subscribedAt: "desc" }
    }),
    prisma.statusPageSubscriber.count({ where: { isActive: true } })
  ]);

  const active   = subscribers.filter(s => s.isActive);
  const inactive = subscribers.filter(s => !s.isActive);

  return (
    <Shell title="Subscribers">
      <PageHeader
        eyebrow="Status Page"
        title="Subscribers"
        description="People who have subscribed to status page updates. They will be notified when incidents are declared or resolved."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        {/* -- Active subscribers -------------------------------- */}
        <div className="space-y-5">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <SectionHeader icon="people" title="Active Subscribers" subtitle={`${active.length} subscriber${active.length !== 1 ? "s" : ""} receiving updates`} />
              <SubscriberCount count={total} />
            </div>

            {active.length > 0 ? (
              <div className="space-y-2">
                {active.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-extrabold text-emerald-700">
                        {(s.name || s.email)[0].toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        {s.name && <p className="text-sm font-bold text-slate-900">{s.name}</p>}
                        <p className="truncate text-xs text-slate-500">{s.email}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Active</span>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {s.subscribedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="notifications"
                text="No active subscribers yet"
                sub="Share the public status page URL - visitors can subscribe from there."
              />
            )}
          </Card>

          {inactive.length > 0 && (
            <Card>
              <SectionHeader icon="remove_circle_outline" title="Unsubscribed" subtitle={`${inactive.length} unsubscribed`} />
              <div className="space-y-2">
                {inactive.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 opacity-60">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-extrabold text-slate-500">
                        {(s.name || s.email)[0].toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        {s.name && <p className="text-sm font-bold text-slate-700">{s.name}</p>}
                        <p className="truncate text-xs text-slate-500">{s.email}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">Unsubscribed</span>
                      {s.unsubscribedAt && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          {s.unsubscribedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* -- Sidebar ------------------------------------------- */}
        <div className="space-y-5">
          {/* Stats */}
          <Card>
            <SectionHeader icon="bar_chart_4_bars" title="Subscriber Overview" />
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Active</span>
                <span className="font-extrabold text-slate-900">{active.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Unsubscribed</span>
                <span className="font-extrabold text-slate-900">{inactive.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Total ever</span>
                <span className="font-extrabold text-slate-900">{subscribers.length}</span>
              </div>
            </div>
          </Card>

          {/* How it works */}
          <Card>
            <SectionHeader icon="info" title="How Subscriptions Work" />
            <div className="space-y-3 text-xs leading-5 text-slate-600">
              <div className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-700">1</span>
                <p>Visitors subscribe via the <strong>public status page</strong> by entering their email.</p>
              </div>
              <div className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-700">2</span>
                <p>Their email is stored here in your subscriber list.</p>
              </div>
              <div className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-700">3</span>
                <p>When incidents are declared or resolved, notifications can be sent to all active subscribers.</p>
              </div>
            </div>
            <a
              href="/status-page/public"
              target="_blank"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              <Icon name="open_in_new" className="text-[16px]" />
              View public status page
            </a>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
