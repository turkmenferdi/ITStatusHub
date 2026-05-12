import { Shell } from "@/components/Shell";
import { Card, FormNotice, PageHeader, SectionHeader, SubmitButton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { createUserAction, toggleUserActiveAction } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const roleCopy = {
  admin: "Full configuration and access control",
  operator: "Manage incidents and communications",
  viewer: "Read-only incident visibility"
};

export default async function UsersPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string }>
}) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    include: { _count: { select: { sessions: true } } }
  });

  return (
    <Shell title="Access">
      <PageHeader
        eyebrow="Access Control"
        title="Team access"
        description="Invite operators, keep viewers limited, and remove access immediately when someone leaves the response process."
      />
      <FormNotice error={params.error} success={params.created ? "Access updated." : undefined} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <SectionHeader icon="people" title="Users" subtitle={`${users.length} account${users.length !== 1 ? "s" : ""} configured`} />
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-950">{user.name}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold capitalize text-slate-700">{user.role}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {roleCopy[user.role]} - {user._count.sessions} active session{user._count.sessions !== 1 ? "s" : ""}
                    {user.lastLoginAt ? ` - Last login ${user.lastLoginAt.toLocaleString()}` : ""}
                  </p>
                </div>
                <form action={toggleUserActiveAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="isActive" value={String(!user.isActive)} />
                  <button className={`inline-flex min-h-9 items-center justify-center rounded-lg px-3 py-2 text-xs font-extrabold transition hover:-translate-y-0.5 ${user.isActive ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                    {user.isActive ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </Card>

        <aside className="space-y-5">
          <Card>
            <SectionHeader icon="person_add" title="Invite User" subtitle="Create an account with a temporary password." />
            <form action={createUserAction} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Name</label>
                <input name="name" required className="w-full" placeholder="Jane Operator" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email</label>
                <input name="email" type="email" required className="w-full" placeholder="jane@company.com" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Role</label>
                <select name="role" defaultValue="operator" className="w-full">
                  <option value="operator">Operator</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Temporary password</label>
                <input name="password" type="password" required minLength={12} className="w-full" placeholder="At least 12 characters" />
              </div>
              <SubmitButton>Create user</SubmitButton>
            </form>
          </Card>

          <Card>
            <SectionHeader icon="verified" title="Role Guide" />
            <div className="space-y-3 text-xs leading-5 text-slate-600">
              {Object.entries(roleCopy).map(([role, description]) => (
                <div key={role} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <Icon name={role === "admin" ? "settings" : role === "operator" ? "campaign" : "visibility"} className="mt-0.5 text-[18px] text-slate-500" />
                  <div>
                    <p className="font-extrabold capitalize text-slate-900">{role}</p>
                    <p>{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </Shell>
  );
}
