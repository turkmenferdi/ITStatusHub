import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { NavLinks, type NavItem } from "@/components/NavLinks";
import { Icon } from "@/components/Icon";
import { prisma } from "@/lib/prisma";

const nav: NavItem[] = [
  { label: "Command Center", href: "/dashboard",       icon: "analytics" },
  { label: "Incidents",      href: "/incidents",       icon: "notifications_active" },
  { label: "Status Page",    href: "/status-page",     icon: "monitor_heart" },
  { label: "Recipients",     href: "/groups",          icon: "group" },
  { label: "Routing Rules",  href: "/routing-rules",   icon: "rule" },
  { label: "Services",       href: "/applications",    icon: "dns" },
  { label: "Types",          href: "/incident-types",  icon: "category" },
  { label: "Templates",      href: "/templates",       icon: "draft" },
  { label: "Analytics",      href: "/analytics",       icon: "bar_chart_4_bars" },
  { label: "Integrations",   href: "/integrations",    icon: "hub" },
  { label: "Access",         href: "/users",           icon: "people" },
  { label: "Settings",       href: "/settings",        icon: "settings" }
];

export async function Shell({ children, title }: { children: React.ReactNode; title: string }) {
  const user = await requireAuth();
  const openCount = await prisma.incident.count({ where: { isOpen: true } });
  const visibleNav = user.role === "admin" ? nav : nav.filter((item) => !["/settings", "/users"].includes(item.href));
  const visibleMobileNav = [visibleNav[0], visibleNav[1], visibleNav[2], visibleNav[3]].filter((item): item is NavItem => Boolean(item));

  return (
    <div className="min-h-screen pb-24 text-slate-950 md:pb-0">
      {/* -- Top Bar ------------------------------------------ */}
      <header className="fixed top-0 z-50 flex h-14 w-full items-center justify-between border-b border-slate-800 bg-slate-950 px-4 shadow-lg shadow-slate-900/40">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group" aria-label="StatusHub home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm transition group-hover:bg-emerald-400">
              <Icon name="wifi_tethering" className="text-[18px]" />
            </span>
            <div className="hidden sm:block">
              <p className="font-headline text-[15px] font-extrabold leading-none text-white">StatusHub</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400 leading-none mt-0.5">{title}</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold capitalize text-slate-300 lg:inline-flex">
            <Icon name="verified" className="text-[14px] text-emerald-400" />
            {user.role}
          </span>
          {openCount > 0 && (
            <Link href="/incidents" className="hidden sm:flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300 hover:bg-red-500/20 transition">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 pulse-dot" />
              {openCount} active
            </Link>
          )}
          <a
            href="/status-page/public"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
          >
            <Icon name="open_in_new" className="text-[14px]" />
            Public status
          </a>
          <form action="/api/auth/logout" method="post">
            <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300">
              <Icon name="logout" className="text-[16px]" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </header>

      {/* -- Sidebar ------------------------------------------ */}
      <aside className="fixed left-0 top-14 hidden h-[calc(100dvh-3.5rem)] w-60 overflow-y-auto bg-slate-950 shadow-sidebar md:block">
        <nav className="flex flex-col gap-0.5 p-3">
          <NavLinks items={visibleNav} openCount={openCount} />
        </nav>
        <div className="border-t border-white/5 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">StatusHub v1.0</p>
          <p className="mt-0.5 text-[10px] text-slate-700">Incident Communication Control Plane</p>
        </div>
      </aside>

      {/* -- Main Content ------------------------------------- */}
      <main className="mx-auto max-w-6xl px-4 pt-16 md:ml-60 md:px-6 md:pt-20">
        {children}
      </main>

      {/* -- Mobile Bottom Nav -------------------------------- */}
      <nav className="fixed bottom-0 left-0 z-50 flex w-full justify-around border-t border-slate-200 bg-white px-2 py-2 shadow-2xl shadow-slate-900/15 md:hidden">
        <NavLinks items={visibleMobileNav} compact openCount={openCount} />
      </nav>
    </div>
  );
}
