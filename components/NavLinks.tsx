"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Icon, type IconName } from "@/components/Icon";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
};

export function NavLinks({ items, compact = false, openCount = 0 }: {
  items: NavItem[];
  compact?: boolean;
  openCount?: number;
}) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const showBadge = item.href === "/incidents" && openCount > 0;

        if (compact) {
          return (
            <Link
              key={item.href}
              className={clsx(
                "relative flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition",
                active ? "text-emerald-600" : "text-slate-500 hover:text-slate-700"
              )}
              href={item.href}
            >
              <Icon name={item.icon} className="text-[22px]" />
              <span className="text-[9px] font-semibold uppercase tracking-widest">{item.label}</span>
              {showBadge && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white">
                  {openCount}
                </span>
              )}
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition",
              active
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-emerald-400" />
            )}
            <Icon name={item.icon} className={clsx("text-[20px] transition", active ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300")} />
            <span className="flex-1">{item.label}</span>
            {showBadge && (
              <span className="flex h-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-extrabold text-white">
                {openCount}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}
