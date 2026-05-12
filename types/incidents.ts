import type { IncidentStage, StatusColor } from "@prisma/client";

export type TemplateContext = {
  app_name: string;
  incident_type: string;
  title: string;
  summary: string;
  working_teams: string;
  next_update_at: string;
  stage: IncidentStage;
  status_color: StatusColor;
};

export type TimelineItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  createdAt: Date;
};
