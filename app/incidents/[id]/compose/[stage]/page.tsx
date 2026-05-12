import Link from "next/link";
import { notFound } from "next/navigation";
import type { IncidentStage } from "@prisma/client";
import { Shell } from "@/components/Shell";
import { Card, FormNotice, InfoRow, SectionHeader, StageBadge, StatusPill, SubmitButton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { confirmStageNotificationAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { recipientGroupsForIncident, renderIncidentStageDraft } from "@/lib/incidents";
import type { Incident, Application, IncidentType } from "@prisma/client";

export const dynamic = "force-dynamic";

const allowedStages: IncidentStage[] = ["started", "update", "resolved", "maintenance"];

const stageCopy: Record<IncidentStage, { title: string; description: string }> = {
  started: {
    title: "Review Service Disruption Message",
    description: "Confirm the initial stakeholder communication before it is sent."
  },
  update: {
    title: "Review Issue Update Message",
    description: "Edit the progress update before notifying stakeholders."
  },
  resolved: {
    title: "Review Resolution Message",
    description: "Confirm the final message. Sending this will close the incident and return the service to green."
  },
  maintenance: {
    title: "Review Maintenance Message",
    description: "Confirm the maintenance communication before it is sent."
  }
};

const audienceCopy = {
  technical: {
    label: "Technical teams",
    purpose: "Actionable detail for responders and service owners."
  },
  business: {
    label: "Business stakeholders",
    purpose: "Clear impact language without noisy implementation detail."
  },
  executive: {
    label: "Executives",
    purpose: "Brief summary focused on customer impact, risk, and next update."
  },
  maintenance: {
    label: "Maintenance audience",
    purpose: "Planned-work timing, expected impact, and completion signal."
  }
};

function fallbackDraft(incident: Incident & { application: Application; incidentType: IncidentType }, stage: IncidentStage) {
  const subjectByStage: Record<IncidentStage, string> = {
    started: `[Disruption] ${incident.application.name} - ${incident.incidentType.name}`,
    update: `[Update] ${incident.application.name} - ${incident.incidentType.name}`,
    resolved: `[Resolved] ${incident.application.name} - service restored`,
    maintenance: `[Planned Maintenance] ${incident.application.name}`
  };
  const closingByStage: Record<IncidentStage, string> = {
    started: "Our teams are actively investigating and working to restore normal service.",
    update: "Our teams continue to work on resolution. We will share another update when more information is available.",
    resolved: "The service has returned to normal operation. Thank you for your patience.",
    maintenance: "During the maintenance window, users may experience temporary disruption or degraded performance."
  };

  return {
    subject: subjectByStage[stage],
    text: `${incident.application.name} ${stage} notification\n\n${incident.summary}\n\n${closingByStage[stage]}\n\nService: ${incident.application.name}\nType: ${incident.incidentType.name}\nWorking teams: ${incident.workingTeams || "To be confirmed"}`
  };
}

export default async function ComposeIncidentMessagePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string; stage: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id, stage: rawStage }, query] = await Promise.all([params, searchParams]);
  const stage = rawStage as IncidentStage;
  if (!allowedStages.includes(stage)) notFound();

  const incident = await prisma.incident.findUnique({
    where: { id },
    include: { application: true, incidentType: true }
  });
  if (!incident) notFound();

  const draftResult = await renderIncidentStageDraft(id, stage)
    .then((draft) => ({ rendered: draft.rendered, warning: null as string | null }))
    .catch((error) => {
      console.error("[COMPOSE_DRAFT_FALLBACK]", { incidentId: id, stage, error });
      return {
        rendered: fallbackDraft(incident, stage),
        warning: "The configured template could not be rendered, so StatusHub prepared a safe fallback message. Review it before sending."
      };
    });

  const recipients = await recipientGroupsForIncident(incident, stage);
  const recipientsByType = recipients.reduce<Record<string, typeof recipients>>((acc, group) => {
    acc[group.groupType] = [...(acc[group.groupType] ?? []), group];
    return acc;
  }, {});
  const recipientCount = recipients.reduce((sum, group) => sum + group.members.length, 0);

  const copy = stageCopy[stage];

  return (
    <Shell title="Review Message">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
          <Link href={`/incidents/${incident.id}`} className="flex items-center gap-1 font-semibold transition hover:text-slate-700">
            <Icon name="arrow_back" className="text-[16px]" />
            Incident detail
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-700">Review message</span>
        </div>

        <FormNotice error={query.error} />
        <FormNotice success={draftResult.warning ?? undefined} />

        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Approval Required</p>
              <h1 className="mt-1 font-headline text-3xl font-extrabold text-slate-950">{copy.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{copy.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StageBadge stage={stage} />
              <StatusPill color={incident.currentColor} pulse={incident.isOpen} />
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <SectionHeader
              icon="outgoing_mail"
              title="Approved Message"
              subtitle="This draft was generated from policy-backed templates. Review, edit, then approve release."
            />
            <form action={confirmStageNotificationAction} className="space-y-4">
              <input type="hidden" name="incidentId" value={incident.id} />
              <input type="hidden" name="stage" value={stage} />

              <div className="space-y-1">
                <label>Subject</label>
                <input name="subject" className="w-full" defaultValue={draftResult.rendered.subject} required />
              </div>

              <div className="space-y-1">
                <label>Message</label>
                <textarea
                  name="bodyText"
                  className="min-h-[320px] w-full resize-y font-mono text-sm leading-6"
                  defaultValue={draftResult.rendered.text}
                  required
                />
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <input type="checkbox" required className="mt-1" />
                <span className="text-sm leading-6 text-emerald-900">
                  <strong>I approve this communication.</strong> It will be sent to {recipientCount} active recipient{recipientCount !== 1 ? "s" : ""} across {recipients.length} group{recipients.length !== 1 ? "s" : ""}, recorded in the incident timeline, and used to keep the status page aligned.
                </span>
              </label>

              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <Link href={`/incidents/${incident.id}`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-800 transition hover:bg-slate-50">
                  Cancel
                </Link>
                <SubmitButton>{stage === "resolved" ? "Approve, send, and resolve" : "Approve and send"}</SubmitButton>
              </div>
            </form>
          </Card>

          <aside className="space-y-5">
            <Card>
              <SectionHeader icon="info" title="Incident Context" />
              <div className="-my-3">
                <InfoRow label="Service" value={incident.application.name} />
                <InfoRow label="Impact" value={<StatusPill color={incident.currentColor} pulse={incident.isOpen} />} />
                <InfoRow label="Incident type" value={incident.incidentType.name} />
                <InfoRow label="Stage to send" value={<StageBadge stage={stage} />} />
                <InfoRow label="Request" value={incident.xurrentRequestId} mono />
              </div>
            </Card>

            <Card>
              <SectionHeader icon="quick_reference_all" title="Communication Pack" subtitle="One incident, different audiences, one controlled release." />
              <div className="space-y-2">
                {Object.entries(audienceCopy).map(([type, copy]) => {
                  const groups = recipientsByType[type] ?? [];
                  if (!groups.length) return null;
                  const count = groups.reduce((sum, group) => sum + group.members.length, 0);
                  return (
                    <div key={type} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900">{copy.label}</p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-slate-600">{count}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{copy.purpose}</p>
                    </div>
                  );
                })}
                <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
                  <p className="text-sm font-bold text-sky-900">Status page</p>
                  <p className="mt-1 text-xs leading-5 text-sky-700">
                    The service status follows the approved incident stage and color.
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <SectionHeader icon="group" title="Recipient Groups" subtitle="Configured groups for this service and incident type." />
              <div className="space-y-2">
                {recipients.map((group) => (
                  <div key={group.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-sm font-bold text-slate-900">{group.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{group.members.length} active recipient{group.members.length !== 1 ? "s" : ""}</p>
                  </div>
                ))}
                {!recipients.length && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
                    No direct rule matched. StatusHub will use active fallback groups when the message is sent.
                  </p>
                )}
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </Shell>
  );
}
