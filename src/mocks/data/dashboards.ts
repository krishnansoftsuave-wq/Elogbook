import type { DashboardWidgetWire } from "@/features/dashboards/schemas";

/**
 * `state.dashWidgets`, app-source.txt 112 — the widget library the Super User
 * assigns to roles.
 *
 * **FR-DASH-01/FR-ADM-07** — dashboards are predefined per role for
 * standardisation; Admin and Super User manage the configuration.
 * **FR-ADM-06** — the Super User "assign[s] widgets to roles".
 * **FR-DASH-04** — regular users get *limited personalisation only* (hide,
 * resize, save layout) and it must not affect anyone else's dashboard.
 *
 * The prototype stores each widget as a positional tuple
 * `['Shift KPIs', 'KPI', true]`. Named fields here: a three-slot tuple is read
 * backwards eventually, and `enabled` needs to be per role rather than global
 * once FR-ADM-06 is honoured — which the tuple has nowhere to put.
 *
 * PROVISIONAL field names.
 */

export const seedDashboardWidgets = (): DashboardWidgetWire[] => [
  {
    id: "WID-001",
    label: "Shift KPIs",
    type: "kpi",
    assigned_roles: ["operator", "supervisor", "management"],
    enabled: true,
  },
  {
    id: "WID-002",
    label: "Current Shift Highlights",
    type: "list",
    assigned_roles: ["operator", "supervisor"],
    enabled: true,
  },
  {
    id: "WID-003",
    label: "Critical Alarms",
    type: "list",
    assigned_roles: ["operator", "supervisor", "management"],
    enabled: true,
  },
  {
    id: "WID-004",
    label: "Previous Shift Summary Report",
    type: "summary",
    assigned_roles: ["operator", "supervisor"],
    enabled: true,
  },
  {
    id: "WID-005",
    label: "Repeating Issues",
    type: "list",
    assigned_roles: ["management"],
    enabled: false,
  },
];
