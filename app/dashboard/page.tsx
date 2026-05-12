import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Card, EmptyState, IncidentAlertBar, MetricCard, PageHeader, ReadinessBadge, SectionHeader, StatusPill, StageBadge, TextLinkButton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { prisma } from "@/lib/prisma";
import { statusSummary } from "@/lib/incidents";
import { env } from "@/lib/env";
import { simulateXurrentIncidentAction } from "@/app/actions";
import type { IconName } from "@/components/Icon";

export const dynamic = "force-dynamic";

function elapsedLabel(date: Date) {
  const ms = Date.now() - date.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function DashboardPage() {
  const now = new Date();
  const [
    openIncidents,
    summary,
    notifications,
    appsCount,
    groupsCount,
    defaultTemplates,
    failedWebhooks
  ] = await Promise.all([
    prisma.incident.findMany({
      where: { isOpen: true },
      include: {
        application: true,
        incidentType: true,
        notifications: { select: { id: true, stage: true, createdAt: true }, orderBy: { createdAt: "desc" } }
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    statusSummary(),
    prisma.incidentNotification.findMany({
      include: { incident: { include: { application: true } }, recipientGroup: true },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.application.count({ where: { isActive: true } }),
    prisma.notificationGroup.count({ where: { isActive: true } }),
    prisma.messageTemplate.count({ where: { isDefault: true } }),
    prisma.webhookEvent.count({ where: { processed: false, processingError: { not: null } } })
  ]);

  const impactedServices = summary.filter((item) => item.color !== "green");
  const communicationCoverage = {
    services: appsCount > 0,
    recipients: groupsCount > 0,
    templates: defaultTemplates >= 4,
    smtp: !env.DEV_EMAIL_MODE && Boolean(env.SMTP_HOST),
    xurrent: Boolean(env.XURRENT_WEBHOOK_SECRET)
  };
  const coverageCount = Object.values(communicationCoverage).filter(Boolean).length;
  const incidentsNeedingFirstMessage = openIncidents.filter((incident) => incident.notifications.length === 0);
  const overdueUpdates = openIncidents.filter((incident) => incident.notifications.length > 0 && incident.nextUpdateAt && incident.nextUpdateAt < now);
  const actionCount = incidentsNeedingFirstMessage.length + overdueUpdates.length + failedWebhooks;
  const actionItems: Array<{ id: string; href: string; icon: IconName; title: string; detail: string; tone: string }> = [
    ...overdueUpdates.map((incident) => ({
      id: `update-${incident.id}`,
      href: `/incidents/${incident.id}/compose/update`,
      icon: "schedule" as IconName,
      title: "Send scheduled update",
      detail: `${incident.application.name}: the promised update time has passed.`,
      tone: "border-red-200 bg-red-50 text-red-800"
    })),
    ...incidentsNeedingFirstMessage.map((incident) => ({
      id: `started-${incident.id}`,
      href: `/incidents/${incident.id}/compose/started`,
      icon: "campaign" as IconName,
      title: "Send first stakeholder message",
      detail: `${incident.application.name}: incident is open but no notification has been sent.`,
      tone: "border-amber-200 bg-amber-50 text-amber-800"
    })),
    ...(failedWebhooks > 0 ? [{
      id: "failed-webhooks",
      href: "/integrations",
      icon: "webhook" as IconName,
      title: "Review failed webhook events",
      detail: `${failedWebhooks} inbound event${failedWebhooks > 1 ? "s" : ""} could not be processed.`,
      tone: "border-red-200 bg-red-50 text-red-800"
    }] : [])
  ].slice(0, 5);

  return (
    <Shell title="Command Center">
      <IncidentAlertBar count={openIncidents.length} />

      <PageHeader
        eyebrow="Command Center"
        title="Incident communication control plane"
        description="Turn Datadog alerts, Xurrent major incidents, and manual reports into approved stakeholder updates, status page changes, and an auditable communication timeline."
      />

      <section className="mb-5 grid gap-3 md:grid-cols-4">
        <MetricCard
          label="Open Incidents"
          value={openIncidents.length}
          detail={openIncidents.length ? "Requires operator action" : "No active incidents"}
          icon="notifications_active"
          accent={openIncidents.length ? "red" : "emerald"}
        />
        <MetricCard
          label="Impacted Services"
          value={impactedServices.length}
          detail={impactedServices.length ? "Visible on status page" : "All services green"}
          icon="monitor_heart"
          accent={impactedServices.length ? "amber" : "emerald"}
        />
        <MetricCard
          label="Email Delivery"
          value={env.DEV_EMAIL_MODE ? "Dev" : "SMTP"}
          detail={env.DEV_EMAIL_MODE ? "Console only" : env.SMTP_HOST}
          icon="outgoing_mail"
          accent={env.DEV_EMAIL_MODE ? "amber" : "emerald"}
        />
        <MetricCard
          label="Action Queue"
          value={actionCount}
          detail={actionCount ? "Operator follow-up waiting" : "No blocked communications"}
          icon="check_circle"
          accent={actionCount ? "amber" : "emerald"}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <Card>
            <SectionHeader
              icon="check_circle"
              title="Next Best Actions"
              subtitle="The work that protects customers from silence and keeps stakeholders aligned."
            />
            {actionItems.length ? (
              <div className="space-y-2">
                {actionItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`group flex items-start justify-between gap-3 rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-card-hover ${item.tone}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/70">
                        <Icon name={item.icon} className="text-[20px]" />
                      </span>
                      <div>
                        <p className="text-sm font-extrabold">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 opacity-80">{item.detail}</p>
                      </div>
                    </div>
                    <Icon name="arrow_forward" className="mt-1 shrink-0 text-[18px] opacity-60 transition group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon="check_circle" text="No operator action waiting" sub="Open incidents, missed updates, and failed webhooks will appear here automatically." />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/incidents" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md">
                <Icon name="campaign" className="text-[18px]" />
                Declare incident
              </Link>
              <a href="/status-page/public" target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md">
                <Icon name="open_in_new" className="text-[18px]" />
                Open public status
              </a>
              <form action={simulateXurrentIncidentAction}>
                <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-extrabold text-cyan-800 transition hover:-translate-y-0.5 hover:bg-cyan-100 hover:shadow-md">
                  <Icon name="hub" className="text-[18px]" />
                  Simulate Xurrent major incident
                </button>
              </form>
            </div>
          </Card>

          <Card>
            <SectionHeader
              icon="notifications_active"
              title="Active Incidents"
              subtitle="What the operator should act on now."
              action={<TextLinkButton href="/incidents" icon="arrow_forward">Manage</TextLinkButton>}
            />
            <div className="space-y-2">
              {openIncidents.length ? openIncidents.map((incident) => (
                <Link
                  key={incident.id}
                  href={`/incidents/${incident.id}`}
                  className="group flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-card-hover"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-950">{incident.title}</p>
                      <StageBadge stage={incident.currentStage} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {incident.application.name} - {incident.incidentType.name}
                      {incident.xurrentRequestId ? ` - ${incident.xurrentRequestId}` : ""}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{incident.summary}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusPill color={incident.currentColor} pulse />
                    <span className="text-[10px] text-slate-400">{elapsedLabel(incident.updatedAt)}</span>
                  </div>
                </Link>
              )) : (
                <EmptyState icon="check_circle" text="No active incidents" sub="All services are currently clear." />
              )}
            </div>
          </Card>

          <Card>
            <SectionHeader
              icon="monitor_heart"
              title="Service Status Preview"
              subtitle="Same status signal used by the public status page."
              action={<TextLinkButton href="/status-page" icon="open_in_new">Internal page</TextLinkButton>}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {summary.map((item) => (
                <div key={item.app.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">{item.app.statusPageLabel}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.message}</p>
                  </div>
                  <StatusPill color={item.color} pulse={item.color !== "green"} />
                </div>
              ))}
            </div>
          </Card>
        </section>

        <aside className="space-y-5">
          <Card>
            <SectionHeader icon="verified" title="Communication Coverage" subtitle={`${coverageCount} of 5 controls active`} />
            <div className="space-y-1.5">
              <ReadinessBadge ready={communicationCoverage.services} label="Services configured" detail={`${appsCount} active service${appsCount !== 1 ? "s" : ""}`} />
              <ReadinessBadge ready={communicationCoverage.recipients} label="Recipients mapped" detail={`${groupsCount} active notification group${groupsCount !== 1 ? "s" : ""}`} />
              <ReadinessBadge ready={communicationCoverage.templates} label="Approved templates" detail={`${defaultTemplates} default template${defaultTemplates !== 1 ? "s" : ""}`} />
              <ReadinessBadge ready={communicationCoverage.smtp} label="Email delivery" detail={env.DEV_EMAIL_MODE ? "Dev mode is on" : env.SMTP_HOST} />
              <ReadinessBadge ready={communicationCoverage.xurrent} label="Xurrent signal" detail="Webhook secret configured" />
            </div>
            {failedWebhooks > 0 && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                {failedWebhooks} webhook event{failedWebhooks > 1 ? "s" : ""} need review.
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader icon="outgoing_mail" title="Latest Email Notifications" subtitle="Recent stakeholder communications." />
            <div className="space-y-2">
              {notifications.length ? notifications.map((notification) => (
                <div key={notification.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-extrabold text-slate-950">{notification.subjectRendered}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      notification.deliveryStatus === "sent" ? "bg-emerald-50 text-emerald-700"
                      : notification.deliveryStatus === "failed" ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700"
                    }`}>
                      {notification.deliveryStatus}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{notification.recipientGroup.name} - {notification.incident.application.name}</p>
                </div>
              )) : (
                <EmptyState icon="mail" text="No notifications yet" sub="Send the first incident announcement to populate this log." />
              )}
            </div>
          </Card>

        </aside>
      </div>
    </Shell>
  );
}
