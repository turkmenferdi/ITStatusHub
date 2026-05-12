import { clsx } from "clsx";
import type { StatusColor } from "@prisma/client";
import { Icon, type IconName } from "@/components/Icon";

/* --- Color maps ------------------------------------------- */
const dotMap: Record<StatusColor, string> = {
  green:  "bg-emerald-500",
  yellow: "bg-amber-500",
  red:    "bg-red-500",
  blue:   "bg-sky-500"
};

const pillMap: Record<StatusColor, string> = {
  green:  "border-emerald-200 bg-emerald-50  text-emerald-800",
  yellow: "border-amber-200  bg-amber-50   text-amber-800",
  red:    "border-red-200    bg-red-50     text-red-800",
  blue:   "border-sky-200    bg-sky-50     text-sky-800"
};

const bannerMap: Record<StatusColor, string> = {
  green:  "bg-emerald-600",
  yellow: "bg-amber-500",
  red:    "bg-red-600",
  blue:   "bg-sky-600"
};

export const statusLabel: Record<StatusColor, string> = {
  green:  "Operational",
  yellow: "Degraded",
  red:    "Major Outage",
  blue:   "Maintenance"
};

export const statusIcon: Record<StatusColor, IconName> = {
  green:  "check_circle",
  yellow: "warning",
  red:    "cancel",
  blue:   "engineering"
};

/* --- Card ------------------------------------------------- */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-xl border border-slate-200/80 bg-white p-5 shadow-card", className)}>
      {children}
    </section>
  );
}

/* --- PageHeader ------------------------------------------- */
export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-6 shadow-card">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{eyebrow}</p>
      <h2 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-slate-950">{title}</h2>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}

/* --- SectionHeader ---------------------------------------- */
export function SectionHeader({ icon, title, subtitle, action }: { icon?: IconName; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {icon ? <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon name={icon} className="text-[18px]" /></span> : null}
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/* --- StatusPill ------------------------------------------- */
export function StatusPill({ color, label, pulse = false }: { color: StatusColor; label?: string; pulse?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold", pillMap[color])}>
      <span className={clsx("h-2 w-2 rounded-full", dotMap[color], pulse && color !== "green" && "pulse-dot")} />
      {label ?? statusLabel[color]}
    </span>
  );
}

/* --- StatusBanner ----------------------------------------- */
export function StatusBanner({ color, label }: { color: StatusColor; label: string }) {
  return (
    <div className={clsx("flex items-center gap-3 px-5 py-3 text-sm font-bold text-white", bannerMap[color])}>
      <Icon name={statusIcon[color]} className="text-[20px]" />
      {label}
    </div>
  );
}

/* --- PriorityBadge ---------------------------------------- */
const priorityMap: Record<string, { bg: string; text: string; label: string }> = {
  P1: { bg: "bg-red-100",    text: "text-red-700",    label: "P1 - Critical" },
  P2: { bg: "bg-amber-100",  text: "text-amber-700",  label: "P2 - High" },
  P3: { bg: "bg-sky-100",    text: "text-sky-700",    label: "P3 - Medium" }
};
export function PriorityBadge({ priority }: { priority?: string | null }) {
  if (!priority) return null;
  const key = priority.toUpperCase().startsWith("P1") ? "P1" : priority.toUpperCase().startsWith("P2") ? "P2" : "P3";
  const p = priorityMap[key] ?? priorityMap.P3;
  return <span className={clsx("rounded-full px-2.5 py-1 text-xs font-extrabold", p.bg, p.text)}>{p.label}</span>;
}

/* --- StageBadge ------------------------------------------- */
const stageMap: Record<string, { bg: string; label: string }> = {
  started:     { bg: "bg-cyan-100 text-cyan-800",     label: "Incident Started" },
  update:      { bg: "bg-amber-100 text-amber-800",   label: "In Progress" },
  resolved:    { bg: "bg-emerald-100 text-emerald-800", label: "Resolved" },
  maintenance: { bg: "bg-sky-100 text-sky-800",       label: "Maintenance" }
};
export function StageBadge({ stage }: { stage: string }) {
  const s = stageMap[stage] ?? { bg: "bg-slate-100 text-slate-700", label: stage };
  return <span className={clsx("rounded-full px-2.5 py-1 text-xs font-bold", s.bg)}>{s.label}</span>;
}

/* --- MetricCard ------------------------------------------- */
export function MetricCard({ label, value, detail, icon, accent = "emerald" }:
  { label: string; value: string | number; detail: string; icon: IconName; accent?: "emerald" | "red" | "amber" | "sky" }) {
  const accentMap = {
    emerald: "bg-emerald-50 text-emerald-700",
    red:     "bg-red-50     text-red-700",
    amber:   "bg-amber-50   text-amber-700",
    sky:     "bg-sky-50     text-sky-700"
  };
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-slate-950">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
        </div>
        <span className={clsx("shrink-0 rounded-lg p-2", accentMap[accent])}>
          <Icon name={icon} className="text-[22px]" />
        </span>
      </div>
    </section>
  );
}

/* --- IncidentAlertBar ------------------------------------- */
export function IncidentAlertBar({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
        <Icon name="warning" className="text-red-600 text-[20px]" />
      </span>
      <div>
        <p className="text-sm font-extrabold text-red-900">
          {count} Active Incident{count > 1 ? "s" : ""} - Immediate Attention Required
        </p>
        <p className="text-xs text-red-700">Open incidents require operator action and stakeholder communication.</p>
      </div>
    </div>
  );
}

/* --- WorkflowStep ----------------------------------------- */
export function WorkflowStep({ step, label, description, icon, active, done, last = false }:
  { step: number; label: string; description: string; icon: IconName; active: boolean; done: boolean; last?: boolean }) {
  return (
    <div className="relative flex gap-4">
      {!last && (
        <div className="absolute left-4 top-9 h-[calc(100%-2.25rem)] w-px bg-slate-200" aria-hidden />
      )}
      <div className={clsx(
        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold transition-all",
        done    ? "border-emerald-500 bg-emerald-500 text-white"
                : active ? "border-cyan-600 bg-white text-cyan-700 shadow-[0_0_0_4px_rgb(8_145_178/0.12)]"
                : "border-slate-200 bg-white text-slate-400"
      )}>
        {done ? <Icon name="check" className="text-[16px]" /> : step}
      </div>
      <div className="pb-6">
        <div className="flex items-center gap-2">
          <span className={clsx("text-sm font-bold", active ? "text-slate-950" : done ? "text-emerald-700" : "text-slate-400")}>{label}</span>
          {active && <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-cyan-700">Current</span>}
        </div>
        <p className={clsx("mt-0.5 text-xs leading-5", active || done ? "text-slate-500" : "text-slate-400")}>{description}</p>
      </div>
    </div>
  );
}

/* --- CommunicationButton ---------------------------------- */
export function CommunicationButton({ icon, label, description, variant = "default", disabled = false }:
  { icon: IconName; label: string; description: string; variant?: "default" | "primary" | "success" | "info"; disabled?: boolean }) {
  const varMap = {
    default: "bg-white text-slate-950 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-card-hover",
    primary: "bg-gradient-to-br from-cyan-700 to-cyan-600 text-white shadow-lg shadow-cyan-900/20 hover:shadow-xl hover:shadow-cyan-900/25",
    success: "bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-900/20 hover:shadow-xl hover:shadow-emerald-900/25",
    info:    "bg-gradient-to-br from-sky-600 to-sky-500 text-white shadow-lg shadow-sky-900/20 hover:shadow-xl hover:shadow-sky-900/25"
  };
  return (
    <button
      type="submit"
      disabled={disabled}
      className={clsx(
        "group flex w-full flex-col items-center justify-center gap-2 rounded-xl p-5 text-center transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40",
        varMap[variant]
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/25">
        <Icon name={icon} className="text-[22px]" />
      </span>
      <span className="text-sm font-extrabold">{label}</span>
      <span className={clsx("text-[11px] leading-4 font-medium", variant === "default" ? "text-slate-500" : "text-white/75")}>{description}</span>
    </button>
  );
}

/* --- InfoRow ---------------------------------------------- */
export function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className={clsx("text-right text-sm font-bold text-slate-800", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}

/* --- EmptyState ------------------------------------------- */
export function EmptyState({ icon = "inbox", text, sub }: { icon?: IconName; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
      <Icon name={icon} className="text-[32px] text-slate-300" />
      <p className="text-sm font-bold text-slate-500">{text}</p>
      {sub ? <p className="max-w-xs text-xs leading-5 text-slate-400">{sub}</p> : null}
    </div>
  );
}

/* --- FormNotice ------------------------------------------- */
export function FormNotice({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return (
    <div className={clsx("mb-4 flex items-start gap-3 rounded-xl border p-4 text-sm", error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
      <Icon name={error ? "error" : "check_circle"} className="mt-0.5 shrink-0 text-[18px]" />
      <span>{error ?? success}</span>
    </div>
  );
}

/* --- SubmitButton ----------------------------------------- */
export function SubmitButton({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "danger" | "secondary" }) {
  const varMap = {
    primary:   "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-900/15",
    danger:    "bg-red-600     text-white hover:bg-red-700     shadow-sm shadow-red-900/15",
    secondary: "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50"
  };
  return (
    <button className={clsx("inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-extrabold transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30 active:translate-y-0", varMap[variant])}>
      {children}
    </button>
  );
}

/* --- TextLinkButton --------------------------------------- */
export function TextLinkButton({ href, children, icon }: { href: string; children: React.ReactNode; icon?: IconName }) {
  return (
    <a
      className="inline-flex min-h-9 items-center gap-1.5 justify-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800 hover:shadow-card-hover"
      href={href}
    >
      {icon && <Icon name={icon} className="text-[16px]" />}
      {children}
    </a>
  );
}

/* --- ReadinessBadge --------------------------------------- */
export function ReadinessBadge({ ready, label, detail }: { ready: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <Icon name={ready ? "check_circle" : "radio_button_unchecked"} className={clsx("shrink-0 text-[18px]", ready ? "text-emerald-600" : "text-slate-300")} />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-800">{label}</span>
        {detail ? <span className="block truncate text-xs text-slate-500">{detail}</span> : null}
      </div>
      <span className={clsx("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold", ready ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
        {ready ? "Ready" : "Pending"}
      </span>
    </div>
  );
}

/* --- StatusColorSelector ---------------------------------- */
export function StatusColorOption({ color, label, selected }: { color: StatusColor; label: string; selected: boolean }) {
  return (
    <label className={clsx(
      "flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition",
      selected ? pillMap[color] + " border-current ring-1 ring-current/30" : "border-slate-200 bg-white hover:bg-slate-50"
    )}>
      <span className={clsx("h-3 w-3 rounded-full", dotMap[color])} />
      <span className="text-sm font-bold">{label}</span>
    </label>
  );
}

/* --- Timeline Entry --------------------------------------- */
const toneClasses: Record<string, string> = {
  green:  "border-emerald-100 bg-emerald-50/70",
  blue:   "border-sky-100     bg-sky-50/70",
  purple: "border-violet-100  bg-violet-50/70",
  amber:  "border-amber-100   bg-amber-50/70",
  slate:  "border-slate-100   bg-white"
};

export function activityToneClasses(tone: string) {
  return toneClasses[tone] ?? toneClasses.slate;
}

/* --- HorizontalBar ---------------------------------------- */
export function HorizontalBar({ label, count, max, colorClass = "bg-gradient-to-r from-cyan-500 to-cyan-600", suffix }: {
  label: string; count: number; max: number; colorClass?: string; suffix?: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-xs font-semibold text-slate-700">{label}</span>
      <div className="flex-1 rounded-full bg-slate-100 h-2.5">
        <div className={clsx("h-2.5 rounded-full transition-all", colorClass)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right text-xs font-bold text-slate-600">{suffix ?? count}</span>
    </div>
  );
}

/* --- TrendPill -------------------------------------------- */
export function TrendPill({ value, unit = "%" }: { value: number | null; unit?: string }) {
  if (value === null) return <span className="text-xs text-slate-400">-</span>;
  const up = value > 0;
  return (
    <span className={clsx("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-extrabold",
      up ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
    )}>
      <Icon name={up ? "trending_up" : "trending_down"} className="text-[12px]" />
      {up ? "+" : ""}{value}{unit}
    </span>
  );
}

/* --- BigStat ---------------------------------------------- */
export function BigStat({ label, value, sub, colorClass = "text-slate-950" }: {
  label: string; value: string | number; sub?: string; colorClass?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={clsx("mt-1 font-headline text-4xl font-extrabold", colorClass)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

/* --- PostMortemSection ------------------------------------ */
export function PostMortemSection({ icon, title, name, defaultValue, placeholder, required = false }: {
  icon: IconName; title: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon name={icon} className="text-[17px]" />
        </span>
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        {required && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">Required</span>}
      </div>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
      />
    </div>
  );
}

/* --- SubscriberCount -------------------------------------- */
export function SubscriberCount({ count }: { count: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
      <Icon name="people" className="text-[14px] text-emerald-600" />
      <span className="text-xs font-bold text-emerald-800">{count} subscriber{count !== 1 ? "s" : ""}</span>
    </div>
  );
}

/* --- TabBar / Tab ----------------------------------------- */
export function TabBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
      {children}
    </div>
  );
}

export function Tab({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <a
      href={href}
      className={clsx(
        "flex-1 rounded-lg px-3 py-2 text-center text-xs font-bold transition",
        active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"
      )}
    >
      {label}
    </a>
  );
}
