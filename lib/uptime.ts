import type { StatusColor } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface UptimeDay {
  date: Date;
  color: StatusColor;
}

export interface UptimeResult {
  bars: UptimeDay[];
  uptimePct: number;
  downtimeMinutes: number;
}

const colorSeverity: Record<StatusColor, number> = {
  green: 0,
  blue: 1,
  yellow: 2,
  red: 3
};

function worstColor(a: StatusColor, b: StatusColor): StatusColor {
  return colorSeverity[a] >= colorSeverity[b] ? a : b;
}

export async function buildUptimeMap(days = 90): Promise<Map<string, UptimeResult>> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const incidents = await prisma.incident.findMany({
    where: { startedAt: { gte: since } },
    select: {
      applicationId: true,
      currentColor: true,
      startedAt: true,
      resolvedAt: true,
      isOpen: true
    }
  });

  const apps = await prisma.application.findMany({
    where: { isActive: true },
    select: { id: true }
  });

  const result = new Map<string, UptimeResult>();

  for (const app of apps) {
    const appIncidents = incidents.filter((i) => i.applicationId === app.id);

    const bars: UptimeDay[] = [];
    let downtimeMinutes = 0;

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(since);
      dayStart.setDate(since.getDate() + (days - 1 - i));
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      let dayColor: StatusColor = "green";
      for (const inc of appIncidents) {
        const incStart = inc.startedAt;
        const incEnd = inc.resolvedAt ?? new Date();
        if (incStart < dayEnd && incEnd > dayStart) {
          dayColor = worstColor(dayColor, inc.currentColor);
        }
      }

      if (dayColor === "red") downtimeMinutes += 1440;
      else if (dayColor === "yellow") downtimeMinutes += 720;

      bars.push({ date: dayStart, color: dayColor });
    }

    const totalMinutes = days * 1440;
    const uptimePct = Math.max(0, Math.round(((totalMinutes - downtimeMinutes) / totalMinutes) * 1000) / 10);

    result.set(app.id, { bars, uptimePct, downtimeMinutes });
  }

  return result;
}
