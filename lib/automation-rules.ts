export type AutomationRule = {
  id: string;
  name: string;
  trigger: string;
  conditions: string[];
  actions: string[];
  source: "Xurrent" | "Datadog" | "Operator";
  enabled: boolean;
};

export const automationRules: AutomationRule[] = [
  {
    id: "xurrent-approved-major",
    name: "Xurrent approved major incident intake",
    source: "Xurrent",
    trigger: "Webhook: request.updated",
    conditions: ["major_incident_status contains approved", "request is production or non-production aware"],
    actions: ["Create or update the matching open incident", "Map service to application catalog", "Apply incident type severity", "Record audit timeline"],
    enabled: true
  },
  {
    id: "datadog-alert-open",
    name: "Datadog alert opens incident",
    source: "Datadog",
    trigger: "Webhook: monitor alert",
    conditions: ["alert_transition is Triggered or alert_status is Alert/Warn", "monitor_id is present"],
    actions: ["Create or update incident using monitor key", "Map service/app tags to application catalog", "Set status color from severity", "Record audit timeline"],
    enabled: true
  },
  {
    id: "datadog-recovery-resolve",
    name: "Datadog recovery resolves incident",
    source: "Datadog",
    trigger: "Webhook: monitor recovery",
    conditions: ["alert_transition is Recovered or alert_status is OK", "matching open incident exists"],
    actions: ["Mark incident resolved", "Set service status to green", "Record recovery in audit timeline"],
    enabled: true
  },
  {
    id: "operator-update-comms",
    name: "Operator sends controlled stakeholder update",
    source: "Operator",
    trigger: "Command Center: Post Update",
    conditions: ["incident is open", "matching recipient groups exist", "matching template exists"],
    actions: ["Render best matching template", "Send or simulate email by environment", "Record communication log", "Record audit timeline"],
    enabled: true
  },
  {
    id: "status-page-summary",
    name: "Status page reflects live incident state",
    source: "Operator",
    trigger: "Incident status changes",
    conditions: ["application is active", "incident is open or resolved"],
    actions: ["Update internal status page summary", "Expose simplified public status page", "Hide internal audit payloads from public users"],
    enabled: true
  }
];
