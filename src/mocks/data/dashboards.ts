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
 * ## Array order is the dashboard's default order
 *
 * `applyLayout` renders widgets in this order until a user saves a personal
 * layout, so this list **is** the standard layout FR-DASH-01 predefines — not
 * merely a catalogue.
 *
 * That is why the six `specKpiSection()` cards lead. On the prototype's
 * operational dashboards **Safety KPI is the first thing on the screen**
 * (`specDashboard` 1130 → `specKpiSection` 751), and an Operator opening this
 * build should see what they were shown in the demo. The FR-HOME-01 widgets
 * follow rather than precede them, because they are this build's addition to
 * that screen — see WID-006/WID-007 below.
 *
 * PROVISIONAL field names.
 */

export const seedDashboardWidgets = (): DashboardWidgetWire[] => [
  /*
    WID-008 … WID-013 — the prototype's `specKpiSection()` cards (751), in the
    order that function returns them.

    ⚠️ **No BRD requirement covers these six.** They ship at the owner's request
    from invented figures — see `mocks/data/plantOps.ts`.

    Assigned to the three roles the prototype shows them to, and **enabled**, so
    the demo matches what was delivered. Being ordinary library rows is the
    point: unassigning all six is a Super User toggle rather than a code change,
    which is the correct amount of ceremony for content that is not yet a
    requirement.
  */
  {
    id: "WID-008",
    label: "Safety KPI",
    type: "chart",
    assigned_roles: ["operator", "supervisor", "management"],
    enabled: true,
  },
  {
    id: "WID-009",
    label: "Production — 7-Day Trend",
    type: "chart",
    assigned_roles: ["operator", "supervisor", "management"],
    enabled: true,
  },
  {
    id: "WID-010",
    label: "Equipment Out of Service",
    type: "list",
    assigned_roles: ["operator", "supervisor", "management"],
    enabled: true,
  },
  {
    id: "WID-011",
    label: "Flare Purge Medium",
    type: "list",
    assigned_roles: ["operator", "supervisor", "management"],
    enabled: true,
  },
  {
    id: "WID-012",
    label: "OLET",
    type: "list",
    assigned_roles: ["operator", "supervisor", "management"],
    enabled: true,
  },
  {
    id: "WID-013",
    label: "Next Ships — Berthing Schedule",
    type: "list",
    assigned_roles: ["operator", "supervisor", "management"],
    enabled: true,
  },

  /*
    The FR-HOME-01 widgets — `state.dashWidgets` (112) plus this build's two.

    ## ⚠️ Published, but assigned to nobody — by owner decision

    Every one of these carries `assigned_roles: []`, so no dashboard shows them.
    That is deliberate and it is a **deviation from the BRD, not from the
    prototype**: the prototype's operational dashboards are the six
    `specKpiSection()` cards and nothing else (`dashboard()` 1136), and the
    owner asked for the screens to match what was demonstrated.

    **The cost, stated plainly:** **FR-HOME-01** requires the home view to show
    "current-shift highlights (events, pending actions, safety observations,
    repeating issues)", and with these unassigned it shows none of them. That
    requirement is currently unmet on the dashboard.

    They are left `enabled: true` rather than deleted precisely so the decision
    stays reversible by a Super User at `/dashboards` — two clicks per role, no
    deploy — which is the whole point of §7.12 and the reason this was a data
    change rather than a code one.
  */
  {
    id: "WID-001",
    label: "Shift KPIs",
    type: "kpi",
    assigned_roles: [],
    enabled: true,
  },
  {
    id: "WID-002",
    label: "Current Shift Highlights",
    type: "list",
    assigned_roles: [],
    enabled: true,
  },
  {
    id: "WID-003",
    label: "Critical Alarms",
    type: "list",
    assigned_roles: [],
    enabled: true,
  },
  /*
    WID-006 and WID-007 are **not** in the prototype's `dashWidgets`, and are
    added deliberately rather than invented.

    The dashboard has rendered both since Phase 1 — Safety Observations because
    **FR-HOME-01** names it in as many words ("events, pending actions, safety
    observations, repeating issues"), and Pending Actions by Status because the
    same requirement names pending actions. The prototype's five-row library
    simply predates them.

    Leaving them out would have made the config screen lie: **FR-DASH-02** gives
    the Super User control over "which metrics each role can see", and two of
    the things on an Operator's dashboard would have been beyond their reach —
    silently, with nothing on screen to say so.
  */
  {
    id: "WID-006",
    label: "Safety Observations",
    type: "list",
    assigned_roles: [],
    enabled: true,
  },
  {
    id: "WID-004",
    label: "Previous Shift Summary Report",
    type: "summary",
    assigned_roles: [],
    enabled: true,
  },
  {
    id: "WID-007",
    label: "Pending Actions by Status",
    type: "chart",
    assigned_roles: [],
    enabled: true,
  },
  /*
    WID-014 … WID-016 — the Super User dashboard's three widgets
    (`defaultWidgets('superuser')`, app-source.txt 139: `users`, `health`,
    `compliance`; its fourth entry, `kpi`, is WID-001 above).

    ⚠️ **No BRD requirement covers these three either.** §6.5 describes the
    Super User's job, not their home screen — `features/platform/schemas.ts`
    records what that means figure by figure.

    **Assigned to nobody, and that is not the same as unreachable.** The Super
    User's dashboard picks them by id (`useRoleWidgets`) because FR-DASH-01
    gives the config screen three columns and none of them is theirs, so there
    is no assignment for a Super User to receive. Leaving `assigned_roles`
    empty keeps them off every dashboard that *is* configurable until somebody
    deliberately ticks a box, which is the right default for cards whose
    figures are illustrative.
  */
  {
    id: "WID-014",
    label: "Active Users",
    type: "list",
    assigned_roles: [],
    enabled: true,
  },
  {
    id: "WID-015",
    label: "System Health",
    type: "list",
    assigned_roles: [],
    enabled: true,
  },
  {
    id: "WID-016",
    label: "Logbook Compliance",
    type: "kpi",
    assigned_roles: [],
    enabled: true,
  },
  /*
    Last, and disabled: **FR-AN-06** records its counting definitions as "to be
    confirmed", so it is assignable but undrawable — configuration without a
    renderer, which is exactly the state of the requirement.
  */
  {
    id: "WID-005",
    label: "Repeating Issues",
    type: "list",
    assigned_roles: ["management"],
    enabled: false,
  },
];
