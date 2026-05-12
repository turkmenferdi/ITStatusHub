import { notFound } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Card, PageHeader, SectionHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { TemplateEditForm } from "@/components/TemplateEditForm";
import { DeleteTemplateButton } from "@/components/DeleteTemplateButton";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const stageLabels: Record<string, string> = {
  started:     "Incident Started",
  update:      "Progress Update",
  resolved:    "Incident Resolved",
  maintenance: "Planned Maintenance"
};

const stageColors: Record<string, string> = {
  started:     "bg-cyan-50 text-cyan-800 border-cyan-200",
  update:      "bg-amber-50 text-amber-800 border-amber-200",
  resolved:    "bg-emerald-50 text-emerald-800 border-emerald-200",
  maintenance: "bg-sky-50 text-sky-800 border-sky-200"
};

const variables = [
  { key: "{{app_name}}",       desc: "Service name (e.g. Website)" },
  { key: "{{incident_type}}",  desc: "Incident type name" },
  { key: "{{title}}",          desc: "Incident title" },
  { key: "{{summary}}",        desc: "Incident summary paragraph" },
  { key: "{{working_teams}}",  desc: "Teams actively working on the incident" },
  { key: "{{next_update_at}}", desc: "ISO date/time of next update" },
  { key: "{{stage}}",          desc: "Current stage (started, update, resolved...)" },
  { key: "{{status_color}}",   desc: "Color token (red, yellow, green, blue)" }
];

export default async function TemplateEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const template = await prisma.messageTemplate.findUnique({
    where: { id },
    include: { application: true, incidentType: true }
  });

  if (!template) notFound();

  const scopeLabel = [template.application?.name, template.incidentType?.name]
    .filter(Boolean).join(" + ") || "Default (all applications & types)";

  return (
    <Shell title="Templates">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/templates" className="flex items-center gap-1 hover:text-slate-900 font-medium transition">
          <Icon name="arrow_back" className="text-[16px]" />
          Templates
        </Link>
        <Icon name="arrow_forward" className="text-[14px]" />
        <span className="font-bold text-slate-900">Edit Template</span>
      </div>

      <PageHeader
        eyebrow="Template Editor"
        title="Edit Message Template"
        description="Customize the subject line and email body. Use variables like {{app_name}} to auto-fill incident details at send time."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        {/* -- Editor ------------------------------------------- */}
        <Card>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${stageColors[template.stage] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
              {stageLabels[template.stage] ?? template.stage}
            </span>
            <span className="text-xs text-slate-500">{scopeLabel}</span>
            {template.isDefault && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">Default fallback</span>
            )}
          </div>

          <TemplateEditForm
            templateId={id}
            initialSubject={template.subjectTemplate}
            initialHtml={template.bodyHtmlTemplate}
            initialText={template.bodyTextTemplate}
          />
        </Card>

        {/* -- Sidebar ------------------------------------------- */}
        <div className="space-y-4">
          {/* Variable reference */}
          <Card>
            <SectionHeader icon="info" title="Template Variables" subtitle="Replaced automatically at send time." />
            <div className="space-y-2">
              {variables.map(v => (
                <div key={v.key} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <code className="block text-xs font-mono font-bold text-cyan-700">{v.key}</code>
                  <p className="mt-0.5 text-xs text-slate-500">{v.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Delete */}
          <Card>
            <SectionHeader icon="delete_outline" title="Danger Zone" />
            <p className="mb-3 text-xs leading-5 text-slate-500">
              Deleting this template is permanent. The default template for this stage will be used instead.
            </p>
            <DeleteTemplateButton templateId={id} />
          </Card>
        </div>
      </div>
    </Shell>
  );
}
