import { Shell } from "@/components/Shell";
import { Card, EmptyState, FormNotice, PageHeader, SectionHeader, SubmitButton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import {
  addGroupMemberAction,
  createGroupAction,
  removeGroupMemberAction,
  deleteGroupAction,
  toggleGroupActiveAction
} from "@/app/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const groupTypeColor: Record<string, string> = {
  technical:   "bg-cyan-50 text-cyan-800 border-cyan-200",
  business:    "bg-violet-50 text-violet-800 border-violet-200",
  executive:   "bg-amber-50 text-amber-800 border-amber-200",
  maintenance: "bg-slate-100 text-slate-700 border-slate-200"
};

export default async function GroupsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string }>
}) {
  const params = await searchParams;
  const groups = await prisma.notificationGroup.findMany({
    include: { members: { where: { isActive: true }, orderBy: { displayName: "asc" } } },
    orderBy: [{ groupType: "asc" }, { name: "asc" }]
  });

  const successMessage = params.created
    ? params.created === "member-removed" ? "Member removed."
    : params.created === "group-deleted" ? "Group deleted."
    : params.created === "group-toggled" ? "Group status updated."
    : "Saved successfully."
    : undefined;

  return (
    <Shell title="Groups">
      <PageHeader
        eyebrow="Recipients"
        title="Notification Groups"
        description="Technical, business, executive, and maintenance audiences for incident messages."
      />
      <FormNotice error={params.error} success={successMessage} />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Group list */}
        <div className="space-y-4">
          {groups.length === 0 && (
            <Card>
              <EmptyState icon="group" text="No groups yet" sub="Create your first notification group to start routing incident emails." />
            </Card>
          )}
          {groups.map((group) => (
            <Card key={group.id}>
              {/* Group header */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Icon name="group" className="text-[20px]" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-extrabold text-slate-950">{group.name}</h3>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize ${groupTypeColor[group.groupType] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {group.groupType}
                      </span>
                      {!group.isActive && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    {group.description && (
                      <p className="mt-1 text-xs text-slate-500">{group.description}</p>
                    )}
                  </div>
                </div>

                {/* Group actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <form action={toggleGroupActiveAction}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="isActive" value={String(!group.isActive)} />
                    <button
                      type="submit"
                      title={group.isActive ? "Deactivate group" : "Activate group"}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                    >
                      <Icon name={group.isActive ? "pause_circle" : "play_circle"} className="text-[16px]" />
                    </button>
                  </form>
                  <form action={deleteGroupAction}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <ConfirmSubmitButton
                      title="Delete group"
                      message={`Delete group "${group.name}"? This cannot be undone.`}
                      icon="delete"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    />
                  </form>
                </div>
              </div>

              {/* Members */}
              <div className="mb-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Members ({group.members.length})
                </p>
                {group.members.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {group.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-1.5 py-1.5"
                      >
                        <div>
                          <span className="block text-xs font-bold text-slate-800">{member.displayName}</span>
                          <span className="block text-[10px] text-slate-500">{member.email}</span>
                        </div>
                        <form action={removeGroupMemberAction}>
                          <input type="hidden" name="memberId" value={member.id} />
                          <button
                            type="submit"
                            title="Remove member"
                            className="ml-1 flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                          >
                            <Icon name="close" className="text-[12px]" />
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No active members - add the first one below.</p>
                )}
              </div>

              {/* Add member form */}
              <form action={addGroupMemberAction} className="grid gap-2 border-t border-slate-100 pt-4 md:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="notificationGroupId" value={group.id} />
                <input
                  name="displayName"
                  placeholder="Display name"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
                <input
                  name="email"
                  type="email"
                  placeholder="person@example.com"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
                <SubmitButton>Add</SubmitButton>
              </form>
            </Card>
          ))}
        </div>

        {/* Create new group */}
        <div className="space-y-4">
          <Card>
            <SectionHeader icon="group_add" title="New Group" subtitle="Create a recipient audience for email notifications." />
            <form action={createGroupAction} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Name</label>
                <input
                  name="name"
                  placeholder="Website Technical Team"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Description</label>
                <textarea
                  name="description"
                  placeholder="Primary technical responders for website incidents"
                  required
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Audience Type</label>
                <select
                  name="groupType"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                >
                  <option value="technical">Technical</option>
                  <option value="business">Business</option>
                  <option value="executive">Executive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" name="isActive" defaultChecked className="rounded" />
                Active (receives notifications)
              </label>
              <SubmitButton>Create Group</SubmitButton>
            </form>
          </Card>

          <Card>
            <SectionHeader icon="info" title="Group Types" />
            <div className="space-y-2 text-xs leading-5 text-slate-600">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-800">Technical</span>
                <span>Engineers and SREs who respond to incidents</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-800">Business</span>
                <span>Product owners and stakeholders who need operational updates</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">Executive</span>
                <span>Leadership who receive critical P1 notifications</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">Maintenance</span>
                <span>Recipients for planned maintenance windows</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
