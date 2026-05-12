import type { StatusColor } from "@prisma/client";

export function elapsedMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

export function elapsedSince(date: Date): string {
  const ms = Date.now() - date.getTime();
  if (ms < 60_000) return "just now";
  return elapsedMs(ms);
}

export function formatDuration(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export function overallColor(colors: StatusColor[]): StatusColor {
  if (colors.includes("red")) return "red";
  if (colors.includes("yellow")) return "yellow";
  if (colors.includes("blue")) return "blue";
  return "green";
}

export const colorBarMap: Record<StatusColor, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-sky-500"
};

export const colorBorderMap: Record<StatusColor, string> = {
  green: "border-emerald-200",
  yellow: "border-amber-200",
  red: "border-red-200",
  blue: "border-sky-200"
};

export const colorBadgeMap: Record<StatusColor, string> = {
  green: "bg-emerald-50 text-emerald-800 border-emerald-200",
  yellow: "bg-amber-50 text-amber-800 border-amber-200",
  red: "bg-red-50 text-red-800 border-red-200",
  blue: "bg-sky-50 text-sky-800 border-sky-200"
};

export const colorLabelMap: Record<StatusColor, string> = {
  green: "Operational",
  yellow: "Degraded",
  red: "Major Outage",
  blue: "Maintenance"
};
