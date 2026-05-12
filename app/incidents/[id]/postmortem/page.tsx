import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Card, FormNotice, PageHeader, PostMortemSection, SectionHeader, StageBadge, StatusPill, SubmitButton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { prisma } from "@/lib/prisma";
import { savePostMortemAction, publishPostMortemAction } from "@/app/actions";

export const dynamic = "force-dynamic";

function formatDuration(from: Date, to?: Date | null): string {
  const ms  = (to ?? new Date()).getTime() - from.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} minutes`;
  const h   = Math.floor(min / 60);
  const rem = min % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h} hours`;
}

export default async function PostMortemPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; published?: string }>;
}) {
  const { id }   = await params;
  const { saved, published } = await searchParams;

  const [incident, postMortem] = await Promise.all([
    prisma.incident.findUnique({
      where: { id },
      include: { application: true, incidentType: true }
    }),
    prisma.postMortem.findUnique({ where: { incidentId: id } })
  ]);

  if (!incident) notFound();
  if (incident.isOpen) redirect(`/incidents/${id}`);

  const duration = formatDuration(incident.startedAt, incident.resolvedAt);

  const severityOptions = [
    { value: "SEV1", label: "SEV1 - Critical",  color: "text-red-700 bg-red-50 border-red-200" },
    { value: "SEV2", label: "SEV2 - High",       color: "text-amber-700 bg-amber-50 border-amber-200" },
    { value: "SEV3", label: "SEV3 - Medium",     color: "text-sky-700 bg-sky-50 border-sky-200" },
    { value: "SEV4", label: "SEV4 - Low",        color: "text-slate-700 bg-slate-100 border-slate-200" }
  ];

  return (
    <Shell title="Post-Mortem">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <Link href={`/incidents/${id}`} className="flex items-center gap-1 hover:text-slate-900 font-medium transition">
          <Icon name="arrow_back" className="text-[16px]" />
          Back to incident
        </Link>
        <Icon name="arrow_forward" className="text-[14px]" />
        <span className="font-bold text-slate-900">Post-Mortem</span>
      </div>

      <PageHeader
        eyebrow="Incident Review"
        title={postMortem ? "Post-Mortem Report" : "New Post-Mortem"}
        description="Document the root cause, impact, and lessons learned. This report helps prevent future incidents."
      />
      <FormNotice success={published === "1" ? "Post-mortem published successfully." : saved === "1" ? "Post-mortem saved successfully." : undefined} />

      {/* Incident summary banner */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <StageBadge stage="resolved" />
              <StatusPill color={incident.currentColor} />
            </div>
            <h3 className="text-base font-extrabold text-slate-950">{incident.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{incident.application.name} - {incident.incidentType.name}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 text-center">
            <div className="rounded-lg bg-slate-50 px-4 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Duration</p>
              <p className="mt-0.5 text-sm font-extrabold text-slate-900">{duration}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Started</p>
              <p className="mt-0.5 text-sm font-extrabold text-slate-900">
                {incident.startedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Resolved</p>
              <p className="mt-0.5 text-sm font-extrabold text-slate-900">
                {incident.resolvedAt
                  ? incident.resolvedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form action={savePostMortemAction}>
        <input type="hidden" name="incidentId" value={id} />

        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          {/* -- Sections ---------------------------------------- */}
          <div className="space-y-4">

            {/* Severity */}
            <Card>
              <SectionHeader icon="warning" title="Severity Classification" subtitle="How severe was this incident's impact?" />
              <div className="grid gap-2 sm:grid-cols-4">
                {severityOptions.map(opt => (
                  <label key={opt.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-xs font-bold transition hover:shadow-sm ${opt.color} ${postMortem?.severity === opt.value ? "ring-2 ring-current/30" : ""}`}>
                    <input type="radio" name="severity" value={opt.value} defaultChecked={postMortem?.severity === opt.value} className="sr-only" />
                    {opt.label}
                  </label>
                ))}
              </div>
            </Card>

            <PostMortemSection
              icon="people"
              title="Customer & Business Impact"
              name="impact"
              defaultValue={postMortem?.impact ?? ""}
              placeholder="Describe the impact on customers and the business. How many users were affected? What functionality was unavailable? Were there any SLA breaches?"
              required
            />

            <PostMortemSection
              icon="schedule"
              title="Incident Timeline"
              name="timeline"
              defaultValue={postMortem?.timeline ?? ""}
              placeholder="Provide a chronological timeline of key events. Example:&#10;14:00 - Monitoring alert fired&#10;14:05 - On-call engineer paged&#10;14:12 - Root cause identified..."
              required
            />

            <PostMortemSection
              icon="info"
              title="Root Cause Analysis"
              name="rootCause"
              defaultValue={postMortem?.rootCause ?? ""}
              placeholder="What was the primary root cause? Be specific and technical. Use the 5-Why method if appropriate."
              required
            />

            <PostMortemSection
              icon="account_tree"
              title="Contributing Factors"
              name="contributingFactors"
              defaultValue={postMortem?.contributingFactors ?? ""}
              placeholder="What other factors made this incident more likely or more severe? E.g. lack of monitoring, unclear runbook, deployment without testing..."
            />

            <PostMortemSection
              icon="tips_and_updates"
              title="Lessons Learned"
              name="lessonsLearned"
              defaultValue={postMortem?.lessonsLearned ?? ""}
              placeholder="What are the key takeaways? What went well? What can be improved?"
              required
            />

            <PostMortemSection
              icon="format_list"
              title="Action Items"
              name="actionItems"
              defaultValue={postMortem?.actionItems ?? ""}
              placeholder="List specific, assignable action items to prevent recurrence. Format:&#10;[ ] ACTION: Owner - Due date&#10;[ ] Add alert for X - @sre-team - 2026-05-01&#10;[ ] Update runbook - @ops - 2026-04-30"
              required
            />
          </div>

          {/* -- Sidebar ----------------------------------------- */}
          <div className="space-y-4">
            {/* Author + publish */}
            <Card>
              <SectionHeader icon="article" title="Author & Status" />
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">Author Name</label>
                  <input
                    type="text"
                    name="authorName"
                    defaultValue={postMortem?.authorName ?? ""}
                    placeholder="Your name"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <SubmitButton>
                    {postMortem ? "Update Report" : "Save Draft"}
                  </SubmitButton>
                  {postMortem && !postMortem.publishedAt && (
                    <form action={publishPostMortemAction}>
                      <input type="hidden" name="incidentId" value={id} />
                      <SubmitButton variant="secondary">
                        <Icon name="publish" className="mr-1 text-[16px]" />
                        Publish
                      </SubmitButton>
                    </form>
                  )}
                </div>
                {postMortem && (
                  <div className={`rounded-lg border p-3 ${postMortem.publishedAt ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50"}`}>
                    {postMortem.publishedAt ? (
                      <p className="text-xs font-bold text-emerald-800">
                        <Icon name="verified" className="inline text-[14px] mr-1" />
                        Published {postMortem.publishedAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-slate-600">
                        <Icon name="draft" className="inline text-[14px] mr-1" />
                        Draft - Last saved {postMortem.updatedAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Tips */}
            <Card>
              <SectionHeader icon="tips_and_updates" title="Post-Mortem Best Practices" />
              <div className="space-y-2.5 text-xs leading-5 text-slate-600">
                <p>check: Focus on <strong>systems and processes</strong>, not individuals.</p>
                <p>check: Be <strong>specific and technical</strong> in the root cause section.</p>
                <p>check: Action items must be <strong>specific and assignable</strong>.</p>
                <p>check: Review with the team within <strong>48 hours</strong> of resolution.</p>
                <p>check: Update this document as the team implements fixes.</p>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </Shell>
  );
}
