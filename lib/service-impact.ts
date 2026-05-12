import type { Application, ApplicationDependency, Incident, IncidentType, StatusColor } from "@prisma/client";

type StatusSummaryItem = {
  app: Application;
  color: StatusColor;
  message: string;
  incident?: (Incident & { incidentType: IncidentType }) | null;
};

type DependencyWithApps = ApplicationDependency & {
  upstreamApplication: Application;
  downstreamApplication: Application;
};

export type ServiceImpact = {
  dependency: DependencyWithApps;
  source: StatusSummaryItem;
  effectiveColor: StatusColor;
};

const severityRank: Record<StatusColor, number> = {
  green: 0,
  blue: 1,
  yellow: 2,
  red: 3
};

export function strongestColor(left: StatusColor, right: StatusColor): StatusColor {
  return severityRank[left] >= severityRank[right] ? left : right;
}

export function buildServiceImpacts(summary: StatusSummaryItem[], dependencies: DependencyWithApps[]) {
  const activeByApplication = new Map(summary.filter((item) => item.color !== "green").map((item) => [item.app.id, item]));
  return dependencies
    .map((dependency) => {
      const source = activeByApplication.get(dependency.upstreamApplicationId);
      if (!source) return null;
      return {
        dependency,
        source,
        effectiveColor: strongestColor(source.color, dependency.impactLevel)
      };
    })
    .filter((impact): impact is ServiceImpact => Boolean(impact))
    .sort((left, right) => severityRank[right.effectiveColor] - severityRank[left.effectiveColor] || left.dependency.downstreamApplication.name.localeCompare(right.dependency.downstreamApplication.name));
}
