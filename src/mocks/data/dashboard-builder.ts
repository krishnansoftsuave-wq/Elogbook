import { ROLES } from "@/constants/roles";
import type {
  DashboardConfigWire,
  DashboardVersionWire,
  LibraryWidgetWire,
} from "@/features/dashboard-builder/schemas";
import { hoursFromBase } from "@/mocks/data/clock";

/**
 * Dashboard Builder fixtures — the prototype's `dashList`/`dashBuilder`
 * (`app-source.txt` 2056–2059, `dashPublish`'s `vers`, 2178). ⚠️
 * PROTOTYPE-ONLY — see `features/dashboard-builder/schemas.ts` for why this
 * exists alongside the BRD-driven `features/dashboards`.
 *
 * The Operator's five widgets match the prototype's `dashBuilder` exactly,
 * including "Repeating Issues" seeded disabled (`app-source.txt` 2059's
 * `wRow` toggle state mirrors `dashWidgets`' fifth tuple).
 */

const operatorWidgets = [
  {
    id: "DBW-001",
    label: "Shift KPIs",
    type: "kpi" as const,
    enabled: true,
    order: 0,
  },
  {
    id: "DBW-002",
    label: "Current Shift Highlights",
    type: "list" as const,
    enabled: true,
    order: 1,
  },
  {
    id: "DBW-003",
    label: "Critical Alarms",
    type: "list" as const,
    enabled: true,
    order: 2,
  },
  {
    id: "DBW-004",
    label: "Previous Shift Summary Report",
    type: "summary" as const,
    enabled: true,
    order: 3,
  },
  {
    id: "DBW-005",
    label: "Repeating Issues",
    type: "list" as const,
    enabled: false,
    order: 4,
  },
];

const supervisorWidgets = [
  {
    id: "DBW-101",
    label: "Shift KPIs",
    type: "kpi" as const,
    enabled: true,
    order: 0,
  },
  {
    id: "DBW-102",
    label: "Critical Alarms",
    type: "list" as const,
    enabled: true,
    order: 1,
  },
  {
    id: "DBW-103",
    label: "Actions by Area",
    type: "bar" as const,
    enabled: true,
    order: 2,
  },
  {
    id: "DBW-104",
    label: "Previous Shift Summary Report",
    type: "summary" as const,
    enabled: true,
    order: 3,
  },
  {
    id: "DBW-105",
    label: "Repeating Issues",
    type: "list" as const,
    enabled: true,
    order: 4,
  },
];

const managementWidgets = [
  {
    id: "DBW-201",
    label: "Shift KPIs",
    type: "kpi" as const,
    enabled: true,
    order: 0,
  },
  {
    id: "DBW-202",
    label: "Alarm Distribution",
    type: "pie" as const,
    enabled: true,
    order: 1,
  },
  {
    id: "DBW-203",
    label: "Actions by Area",
    type: "bar" as const,
    enabled: true,
    order: 2,
  },
  {
    id: "DBW-204",
    label: "Critical Alarms Trend",
    type: "line" as const,
    enabled: true,
    order: 3,
  },
  {
    id: "DBW-205",
    label: "Equipment Status",
    type: "table" as const,
    enabled: true,
    order: 4,
  },
];

const administratorWidgets = [
  {
    id: "DBW-301",
    label: "Shift KPIs",
    type: "kpi" as const,
    enabled: true,
    order: 0,
  },
  {
    id: "DBW-302",
    label: "Equipment Status",
    type: "table" as const,
    enabled: true,
    order: 1,
  },
  {
    id: "DBW-303",
    label: "Notes & Handover",
    type: "text" as const,
    enabled: true,
    order: 2,
  },
  {
    id: "DBW-304",
    label: "Repeating Issues",
    type: "list" as const,
    enabled: false,
    order: 3,
  },
];

export const seedDashboardConfigs = (base: Date): DashboardConfigWire[] => [
  {
    id: "DASH-OPERATOR",
    role: ROLES.OPERATOR,
    name: "Shift Overview",
    status: "published",
    widgets: operatorWidgets,
    assigned_roles: [ROLES.OPERATOR],
    layout_columns: 3,
    is_default: true,
    last_updated_at: hoursFromBase(-2, base),
    last_published_at: hoursFromBase(-2, base),
    published_version: "v1.4",
    affected_user_count: 24,
  },
  {
    id: "DASH-SUPERVISOR",
    role: ROLES.SUPERVISOR,
    name: "Shift Oversight",
    status: "published",
    widgets: supervisorWidgets,
    assigned_roles: [ROLES.SUPERVISOR],
    layout_columns: 3,
    is_default: true,
    last_updated_at: hoursFromBase(-24, base),
    last_published_at: hoursFromBase(-24, base),
    published_version: "v1.2",
    affected_user_count: 9,
  },
  {
    id: "DASH-MANAGEMENT",
    role: ROLES.MANAGEMENT,
    name: "Executive KPIs",
    status: "published",
    widgets: managementWidgets,
    assigned_roles: [ROLES.MANAGEMENT],
    layout_columns: 2,
    is_default: true,
    last_updated_at: hoursFromBase(-72, base),
    last_published_at: hoursFromBase(-72, base),
    published_version: "v1.1",
    affected_user_count: 5,
  },
  {
    id: "DASH-ADMINISTRATOR",
    role: ROLES.ADMINISTRATOR,
    name: "System Health",
    status: "draft",
    widgets: administratorWidgets,
    assigned_roles: [ROLES.ADMINISTRATOR],
    layout_columns: 3,
    is_default: true,
    last_updated_at: hoursFromBase(-120, base),
    last_published_at: null,
    published_version: null,
    affected_user_count: 3,
  },
];

export const seedDashboardVersions = (base: Date): DashboardVersionWire[] => [
  {
    id: "DVER-0001",
    dashboard_id: "DASH-OPERATOR",
    version: "v1.4",
    changed_by: "Admin",
    changed_at: hoursFromBase(-2, base),
    status: "live",
    widgets_snapshot: operatorWidgets,
    layout_columns_snapshot: 3,
    changelog: [
      'Added "Repeating Issues" widget',
      'Renamed "KPIs" → "Shift KPIs"',
      "Reordered layout (3 columns)",
    ],
  },
  {
    id: "DVER-0002",
    dashboard_id: "DASH-OPERATOR",
    version: "v1.3",
    changed_by: "Admin",
    changed_at: hoursFromBase(-312, base),
    status: "archived",
    widgets_snapshot: operatorWidgets
      .filter((widget) => widget.id !== "DBW-005")
      .map((widget, index) => ({ ...widget, order: index })),
    layout_columns_snapshot: 3,
    changelog: ['Removed "Repeating Issues" widget'],
  },
  {
    id: "DVER-0003",
    dashboard_id: "DASH-OPERATOR",
    version: "v1.2",
    changed_by: "M. Raisi",
    changed_at: hoursFromBase(-696, base),
    status: "archived",
    widgets_snapshot: operatorWidgets
      .slice(0, 3)
      .map((widget, index) => ({ ...widget, order: index })),
    layout_columns_snapshot: 2,
    changelog: ["Initial widget set expanded to include shift summaries"],
  },
  {
    id: "DVER-0004",
    dashboard_id: "DASH-OPERATOR",
    version: "v1.1",
    changed_by: "Admin",
    changed_at: hoursFromBase(-1176, base),
    status: "archived",
    widgets_snapshot: operatorWidgets
      .slice(0, 2)
      .map((widget, index) => ({ ...widget, order: index })),
    layout_columns_snapshot: 2,
    changelog: ["Dashboard created"],
  },
];

/**
 * The widget library, from `dashLibrary` (`app-source.txt` 2113). The same
 * catalog every role's builder adds from — categorised for the library's
 * sidebar filter, unlike `features/dashboards`'s flat catalog.
 */
export const seedLibraryWidgets = (): LibraryWidgetWire[] => [
  { id: "LIB-001", label: "Shift KPIs", type: "kpi", category: "KPI cards" },
  {
    id: "LIB-002",
    label: "Safety Observations",
    type: "kpi",
    category: "KPI cards",
  },
  {
    id: "LIB-003",
    label: "Critical Alarms Trend",
    type: "line",
    category: "Charts",
  },
  { id: "LIB-004", label: "Actions by Area", type: "bar", category: "Charts" },
  {
    id: "LIB-005",
    label: "Alarm Distribution",
    type: "pie",
    category: "Charts",
  },
  {
    id: "LIB-006",
    label: "Repeating Issues",
    type: "table",
    category: "Tables",
  },
  {
    id: "LIB-007",
    label: "Equipment Status",
    type: "table",
    category: "Tables",
  },
  {
    id: "LIB-008",
    label: "Current Shift Highlights",
    type: "list",
    category: "Lists",
  },
  { id: "LIB-009", label: "Pending Actions", type: "list", category: "Lists" },
  {
    id: "LIB-010",
    label: "Previous Shift Summary Report",
    type: "summary",
    category: "Notes",
  },
  {
    id: "LIB-011",
    label: "Notes & Handover",
    type: "text",
    category: "Notes",
  },
];
