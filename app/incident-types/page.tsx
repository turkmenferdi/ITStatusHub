import { Shell } from "@/components/Shell";
import { Card, EmptyState, FormNotice, PageHeader, SectionHeader, StatusPill, SubmitButton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { createIncidentTypeAction, deleteIncidentTypeAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function IncidentTypesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string }>
}) {
  const params = await searchParams;
  const types = await prisma.incidentType.findMany({ orderBy: { severityLevel: "asc" } });

  const successMessage = params.created
    ? params.created === "type-deleted" ? "Incident type deleted."
    : "Incident type created successfully."
    : undefined;

  return (
    <Shell title="Incident Types">
      <PageHeader
        eyebrow="Routing"
        title="Incident Types"
        description="Severity, default status color, and recipient eligibility for each incident class."
      />
      <FormNotice error={params.error} success={successMessage} />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Type list */}
        <div className="space-y-3">
          {types.length === 0 && (
            <Card>
              <EmptyState icon="category" text="No incident types configured" sub="Create an incident type to classify incidents and control which audiences are notified." />
            </Card>
          )}
          {types.map((type) => (
            <Card key={type.id} className="!p-0 overflow-hidden">
              <div className="flex items-start gap-0">
                {/* Severity strip */}
                <div className={`w-1.5 shrink-0 self-stretch ${type.defaultColor === "red" ? "bg-red-500" : type.defaultColor === "yellow" ? "bg-amber-500" : type.defaultColor === "blue" ? "bg-sky-500" : "bg-emerald-500"}`} />

                <div className="flex flex-1 items-start justify-between gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-extrabold text-slate-950">{type.name}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        SEV{type.severityLevel}
                      </span>
                      <StatusPill color={type.defaultColor} />
                      {type.isMaintenance && (
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
                          Maintenance
                        </span>
                      )}
                    </div>

                    {/* Audience flags */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${type.notifyTechnical ? "bg-cyan-50 text-cyan-700" : "bg-slate-100 text-slate-400 line-through"}`}>
                        Technical
                      </span>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${type.notifyBusiness ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-400 line-through"}`}>
                        Business
                      </span>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${type.notifyExecutive ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-400 line-through"}`}>
                        Executive
                      </span>
                    </div>
                  </div>

                  {/* Delete action */}
                  <form action={deleteIncidentTypeAction}>
                    <input type="hidden" name="typeId" value={type.id} />
                    <button
                      type="submit"
                      title="Delete incident type"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <Icon name="delete" className="text-[16px]" />
                    </button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Create form */}
        <div className="space-y-4">
          <Card>
            <SectionHeader icon="add_circle" title="New Incident Type" subtitle="Define a classification for routing and severity." />
            <form action={createIncidentTypeAction} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Name</label>
                <input
                  name="name"
                  placeholder="Full Outage"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Severity Level</label>
                <select
                  name="severityLevel"
                  defaultValue="1"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                >
                  <option value="1">SEV1 - Critical</option>
                  <option value="2">SEV2 - High</option>
                  <option value="3">SEV3 - Medium</option>
                  <option value="4">SEV4 - Low</option>
                  <option value="5">SEV5 - Informational</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Default Status Color</label>
                <select
                  name="defaultColor"
                  defaultValue="red"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                >
                  <option value="red">Red - Major Outage</option>
                  <option value="yellow">Yellow - Degraded</option>
                  <option value="blue">Blue - Maintenance</option>
                  <option value="green">Green - Operational</option>
                </select>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Notify Audiences</p>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="notifyTechnical" defaultChecked className="rounded" />
                  Technical (engineers, SREs)
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="notifyBusiness" defaultChecked className="rounded" />
                  Business (product, stakeholders)
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="notifyExecutive" className="rounded" />
                  Executive (leadership)
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="isMaintenance" className="rounded" />
                  This is a maintenance window type
                </label>
              </div>

              <SubmitButton>Create Incident Type</SubmitButton>
            </form>
          </Card>

          <Card>
            <SectionHeader icon="info" title="How Types Route Emails" />
            <div className="space-y-2 text-xs leading-5 text-slate-600">
              <p>Each incident type controls <strong>which audience groups</strong> receive notifications.</p>
              <p>The routing rule for each <strong>Service + Type</strong> combination can be customized on the <a href="/routing-rules" className="font-bold text-emerald-700 hover:underline">Routing Rules</a> page.</p>
              <p>Without a specific rule, all active groups of the matching type receive the notification.</p>
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
