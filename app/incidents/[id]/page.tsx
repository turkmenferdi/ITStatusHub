import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Card, InfoRow, SectionHeader, StageBadge, StatusPill, SubmitButton, WorkflowStep, activityToneClasses } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { addManualNoteAction, changeIncidentColorAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { activityPresentation } from "@/lib/activity";
import { recipientGroupsForIncident } from "@/lib/incidents";
import type { StatusColor } from "@prisma/client";

export const dynamic = "force-dynamic";

const colorDotMap: Record<StatusColor, string> = {
  green:  "bg-emerald-500",
  yellow: "bg-amber-500",
  red:    "bg-red-500",
  blue:   "bg-sky-500"
};

const colorBorderMap: Record<StatusColor, string> = {
  green:  "border-emerald-500/40 bg-emerald-50",
  yellow: "border-amber-500/40  bg-amber-50",
  red:    "border-red-500/40    bg-red-50",
  blue:   "border-sky-500/40    bg-sky-50"
};

const colorHeaderMap: Record<StatusColor, string> = {
  green:  "from-emerald-800 to-emerald-900",
  yellow: "from-amber-700   to-amber-900",
  red:    "from-red-800     to-slate-950",
  blue:   "from-sky-800     to-sky-900"
};

const colorLabelMap: Record<StatusColor, { label: string; sub: string }> = {
  green:  { label: "Operational",   sub: "Service is functioning normally" },
  yellow: { label: "Degraded",      sub: "Service performance is impacted" },
  red:    { label: "Major Outage",  sub: "Service is down for users" },
  blue:   { label: "Maintenance",   sub: "Scheduled maintenance in progress" }
};

function elapsedSince(date: Date) {
  const ms = Date.now() - date.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      application: true,
      incidentType: true,
      notifications: { include: { recipientGroup: true }, orderBy: { createdAt: "desc" } }
    }
  });
  if (!incident) notFound();

  const audit = await prisma.auditLog.findMany({
    where: { entityType: "Incident", entityId: incident.id },
    orderBy: { createdAt: "desc" },
    take: 30
  });

  const notifCount  = incident.notifications.length;
  const lastNotif   = incident.notifications[0];
  const nextUpdateLate = Boolean(incident.nextUpdateAt && incident.nextUpdateAt < new Date());
  const recommendedStage = !incident.isOpen
    ? null
    : notifCount === 0
      ? incident.currentStage === "maintenance" ? "maintenance" : "started"
      : nextUpdateLate
        ? "update"
        : incident.currentStage === "maintenance" ? "maintenance" : "update";
  const recommendedHref = recommendedStage ? `/incidents/${incident.id}/compose/${recommendedStage}` : `/incidents/${incident.id}/postmortem`;
  const plannedGroups = recommendedStage ? await recipientGroupsForIncident(incident, recommendedStage) : [];
  const plannedRecipientCount = plannedGroups.reduce((sum, group) => sum + group.members.length, 0);
  const stageOrder  = ["started", "update", "resolved"];
  const stageIdx    = stageOrder.indexOf(incident.currentStage);

  const stageIsDone  = (s: string) => {
    if (!incident.isOpen) return true;
    return stageOrder.indexOf(s) < stageIdx;
  };
  const stageIsActive = (s: string) => incident.isOpen && incident.currentStage === s;

  return (
    <Shell title="Incident Detail">
      <div className="mx-auto max-w-5xl">
        {/* -- Breadcrumb -------------------------------- */}
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
          <Link href="/incidents" className="flex items-center gap-1 font-semibold hover:text-slate-700 transition">
            <Icon name="arrow_back" className="text-[16px]" />
            Incidents
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-700 truncate">{incident.title}</span>
        </div>

        {/* -- Incident Header --------------------------- */}
        <div className={`mb-5 overflow-hidden rounded-2xl bg-gradient-to-br ${colorHeaderMap[incident.currentColor]} text-white shadow-xl`}>
          <div className="px-6 py-5">
            {/* Status badges row */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest">
                {incident.isOpen ? "LIVE INCIDENT" : "RESOLVED"}
              </span>
              {incident.xurrentRequestId && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                  4me - {incident.xurrentRequestId}
                </span>
              )}
              <StageBadge stage={incident.currentStage} />
            </div>

            {/* Title */}
            <h1 className="font-headline text-2xl font-extrabold leading-snug md:text-3xl">{incident.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">{incident.summary}</p>

            {/* Info grid */}
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Service</p>
                <p className="mt-1 text-sm font-extrabold">{incident.application.name}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Severity</p>
                <p className="mt-1 text-sm font-extrabold">{incident.incidentType.name}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Status</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${colorDotMap[incident.currentColor]} ${incident.isOpen ? "pulse-dot" : ""}`} />
                  <span className="text-sm font-extrabold">{colorLabelMap[incident.currentColor].label}</span>
                </div>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Duration</p>
                <p className="mt-1 text-sm font-extrabold">{elapsedSince(incident.startedAt)}</p>
              </div>
            </div>
          </div>

          {/* Progress bar for open incidents */}
          {incident.isOpen && (
            <div className="border-t border-white/10 bg-black/20 px-6 py-3">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="font-semibold">Response in progress</span>
                <span>{notifCount} notification{notifCount !== 1 ? "s" : ""} sent</span>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-white/60" style={{ width: `${Math.min(100, notifCount * 25)}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* -- Main column ----------------------------- */}
          <div className="space-y-5">

            {/* Communication Actions */}
            {incident.isOpen && (
              <Card>
                <SectionHeader
                  icon="outgoing_mail"
                  title="Stakeholder Communication"
                  subtitle="Send templated notifications to all subscriber groups with one click."
                />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {([
                    ["started", "campaign", "Service Disruption", "Review initial disruption message", "bg-cyan-700 text-white border-cyan-700"],
                    ["update", "update", "Issue Ongoing", "Review progress update message", "bg-white text-slate-950 border-slate-200"],
                    ["resolved", "check_circle", "Issue Resolved", "Review resolution message", "bg-emerald-600 text-white border-emerald-600"],
                    ["maintenance", "engineering", "Planned Maintenance", "Review maintenance message", "bg-sky-600 text-white border-sky-600"]
                  ] as const).map(([stage, icon, label, description, classes]) => (
                    <Link
                      key={stage}
                      href={`/incidents/${incident.id}/compose/${stage}`}
                      className={`group flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border p-5 text-center transition hover:-translate-y-0.5 hover:shadow-card-hover ${classes}`}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/25">
                        <Icon name={icon} className="text-[22px]" />
                      </span>
                      <span className="text-sm font-extrabold">{label}</span>
                      <span className={`text-[11px] font-medium leading-4 ${classes.startsWith("bg-white") ? "text-slate-500" : "text-white/75"}`}>{description}</span>
                    </Link>
                  ))}
                </div>

                {lastNotif && (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs">
                    <span className="font-semibold text-slate-500">Last sent</span>
                    <span className="font-bold text-slate-800">{lastNotif.recipientGroup.name} - {lastNotif.createdAt.toLocaleString()}</span>
                  </div>
                )}
              </Card>
            )}

            {/* Incident Lifecycle / Workflow */}
            <Card>
              <SectionHeader icon="route" title="Response Workflow" subtitle="Track the incident lifecycle from detection to resolution." />
              <div className="pl-2">
                <WorkflowStep step={1} label="Incident Declared" description="4me/Xurrent major incident approved, StatusHub record created automatically." icon="warning" done={true} active={false} />
                <WorkflowStep step={2} label="Stakeholders Notified" description='Initial "Service disruption detected" message sent to all subscriber groups.' icon="campaign" done={stageIsDone("started") || !incident.isOpen} active={stageIsActive("started")} />
                <WorkflowStep step={3} label="Progress Updates" description='"Investigation ongoing" updates dispatched to keep stakeholders informed.' icon="update" done={stageIsDone("update") || !incident.isOpen} active={stageIsActive("update")} />
                <WorkflowStep step={4} label="Service Restored" description='"Service returned to normal" confirmation sent, status page turned green.' icon="check_circle" done={!incident.isOpen} active={!incident.isOpen} last />
              </div>
            </Card>

            {/* Response teams */}
            {incident.workingTeams && (
              <Card>
                <SectionHeader icon="group" title="Response Teams" subtitle="Teams actively working this incident." />
                <div className="flex flex-wrap gap-2">
                  {incident.workingTeams.split(",").map((team) => (
                    <div key={team} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-bold text-slate-800">{team.trim()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <SectionHeader icon="history" title="Incident Timeline" subtitle="All events and actions in reverse chronological order." />
              <div className="space-y-4">
                {audit.map((item) => {
                  const activity = activityPresentation(item);
                  return (
                    <div key={item.id} className="relative pl-7">
                      <div className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300 shadow-sm ring-2 ring-slate-100" />
                      {/* connector */}
                      <div className="absolute left-[4px] top-5 h-[calc(100%+0.75rem)] w-px bg-slate-100" aria-hidden />
                      <div className={`rounded-xl border p-4 ${activityToneClasses(activity.tone)}`}>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-bold text-slate-900">{activity.title}</span>
                          <span className="shrink-0 text-[10px] font-semibold text-slate-400">{item.createdAt.toLocaleString()}</span>
                        </div>
                        <p className="mt-1.5 text-xs leading-5 text-slate-600">{activity.detail}</p>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{item.actorName}</p>
                      </div>
                    </div>
                  );
                })}
                {!audit.length && <p className="text-sm text-slate-500">No events recorded yet.</p>}
              </div>
            </Card>

            {/* Notification log */}
            {incident.notifications.length > 0 && (
              <Card>
                <SectionHeader icon="mail" title="Communication Log" subtitle={`${notifCount} email notification${notifCount !== 1 ? "s" : ""} dispatched`} />
                <div className="space-y-3">
                  {incident.notifications.map((n) => (
                    <div key={n.id} className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon name="mail" className="text-slate-400 text-[16px]" />
                          <span className="text-sm font-bold text-slate-900">{n.recipientGroup.name}</span>
                          <StageBadge stage={n.stage} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${n.deliveryStatus === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {n.deliveryStatus}
                          </span>
                          <span className="text-[10px] text-slate-400">{n.createdAt.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="bg-white px-4 py-3 font-mono text-[11px] leading-5 text-slate-600">
                        <p><span className="font-bold text-slate-800">Subject: </span>{n.subjectRendered}</p>
                        <p className="mt-2 italic text-slate-500">{n.bodyRendered.replace(/<[^>]+>/g, " ").trim().slice(0, 250)}...</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* -- Right sidebar --------------------------- */}
          <aside className="space-y-5">
            {/* Incident details */}
            <Card>
              <SectionHeader icon="info" title="Incident Details" />
              <div className="-my-3">
                <InfoRow label="Service" value={incident.application.name} />
                <InfoRow label="Severity" value={incident.incidentType.name} />
                <InfoRow label="Status" value={<StatusPill color={incident.currentColor} pulse={incident.isOpen} />} />
                <InfoRow label="Stage" value={<StageBadge stage={incident.currentStage} />} />
                {incident.xurrentRequestId && (
                  <InfoRow label="4me Request" value={incident.xurrentRequestId} mono />
                )}
                {incident.xurrentMajorIncidentStatus && (
                  <InfoRow label="4me Status" value={incident.xurrentMajorIncidentStatus} />
                )}
                <InfoRow label="Started" value={incident.startedAt.toLocaleString()} />
                {incident.resolvedAt && (
                  <InfoRow label="Resolved" value={incident.resolvedAt.toLocaleString()} />
                )}
                {incident.nextUpdateAt && incident.isOpen && (
                  <InfoRow label="Next update" value={incident.nextUpdateAt.toLocaleString()} />
                )}
              </div>
            </Card>

            {/* Status override */}
            {incident.isOpen && (
              <Card>
                <SectionHeader icon="palette" title="Override Status" subtitle="Manually set service color, independent of 4me priority." />
                <form action={changeIncidentColorAction} className="space-y-2">
                  <input type="hidden" name="incidentId" value={incident.id} />
                  {([
                    ["red",    "Major Outage",  "Service is down"],
                    ["yellow", "Degraded",      "Impaired performance"],
                    ["blue",   "Maintenance",   "Planned work"],
                    ["green",  "Operational",   "Return to normal"]
                  ] as const).map(([color, label, sub]) => (
                    <label key={color} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition hover:bg-slate-50 ${incident.currentColor === color ? "border-current ring-1 ring-current/20 " + (color === "red" ? "border-red-400 bg-red-50" : color === "yellow" ? "border-amber-400 bg-amber-50" : color === "blue" ? "border-sky-400 bg-sky-50" : "border-emerald-400 bg-emerald-50") : "border-slate-200 bg-white"}`}>
                      <input type="radio" name="color" value={color} defaultChecked={incident.currentColor === color} className="sr-only" />
                      <span className={`h-3 w-3 rounded-full flex-shrink-0 ${color === "red" ? "bg-red-500" : color === "yellow" ? "bg-amber-500" : color === "blue" ? "bg-sky-500" : "bg-emerald-500"}`} />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">{label}</p>
                        <p className="text-[11px] text-slate-500">{sub}</p>
                      </div>
                      {incident.currentColor === color && <Icon name="check_circle" className="text-slate-400 text-[16px]" />}
                    </label>
                  ))}
                  <SubmitButton>Apply status change</SubmitButton>
                </form>
              </Card>
            )}

            {/* Recommended action */}
            <Card>
              <SectionHeader icon="tips_and_updates" title="Recommended Action" />
              <p className="text-sm font-bold leading-6 text-slate-800">
                {!incident.isOpen
                  ? "Incident resolved. Start a post-mortem to document the root cause and prevent recurrence."
                  : notifCount === 0
                    ? "Send the first stakeholder notification before people start asking for status in side channels."
                    : nextUpdateLate
                      ? "The promised update time has passed. Send a progress update now."
                      : "Keep stakeholders informed before the next scheduled update time."}
              </p>
              {incident.nextUpdateAt && incident.isOpen && (
                <p className={`mt-2 text-xs ${nextUpdateLate ? "font-bold text-red-700" : "text-slate-500"}`}>
                  Next update scheduled: <strong>{incident.nextUpdateAt.toLocaleString()}</strong>
                </p>
              )}
              <Link
                href={recommendedHref}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <Icon name={incident.isOpen ? "outgoing_mail" : "article"} className="text-emerald-400 text-[18px]" />
                {incident.isOpen
                  ? recommendedStage === "started" ? "Review first message"
                    : recommendedStage === "maintenance" ? "Review maintenance message"
                    : "Review update message"
                  : "Start post-mortem"}
              </Link>
            </Card>

            {/* Audience plan */}
            {incident.isOpen && (
              <Card>
                <SectionHeader icon="group" title="Audience Plan" subtitle={`${plannedRecipientCount} recipient${plannedRecipientCount !== 1 ? "s" : ""} across ${plannedGroups.length} group${plannedGroups.length !== 1 ? "s" : ""}.`} />
                <div className="space-y-2">
                  {plannedGroups.map((group) => (
                    <div key={group.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-slate-900">{group.name}</p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-slate-600">
                          {group.members.length}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] capitalize text-slate-500">{group.groupType} audience</p>
                    </div>
                  ))}
                  {!plannedGroups.length && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">
                      No audience is mapped for this service and incident type. Add routing rules before sending.
                    </div>
                  )}
                </div>
            </Card>
            )}

            {/* Manual note */}
            <Card>
              <SectionHeader icon="note_add" title="Add Internal Note" subtitle="Visible in timeline. Not sent to stakeholders." />
              <form action={addManualNoteAction} className="space-y-2">
                <input type="hidden" name="incidentId" value={incident.id} />
                <textarea
                  name="note"
                  placeholder="Add an internal note, observation, or handoff message..."
                  className="min-h-[80px] w-full resize-none text-sm"
                />
                <SubmitButton>Add note</SubmitButton>
              </form>
            </Card>
          </aside>
        </div>
      </div>
    </Shell>
  );
}
