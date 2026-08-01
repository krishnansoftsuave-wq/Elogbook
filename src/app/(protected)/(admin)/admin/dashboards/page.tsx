import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardWidgetsTable } from "@/features/dashboards/components/DashboardWidgetsTable";

export const metadata: Metadata = { title: "Dashboards" };

/**
 * §7.12 / **FR-ADM-06** / **FR-DASH-02** — widget-to-role assignment.
 *
 * The prototype's `dashboards()` router (`app-source.txt` 2045–2052) also
 * has a per-role builder, a widget "library", a read-only preview and a
 * publish/version-history flow. None of those had a contract behind them
 * originally: this repo's `dashboardWidgetSchema`
 * (`src/features/dashboards/schemas.ts`) and its mock routes model one fixed
 * widget catalog with a global `enabled` flag and a role-assignment list per
 * widget — no draft state, no per-role widget library, no versions. That
 * remains the FR-ADM-06/FR-DASH-02 contract this screen implements.
 *
 * **Reachability, 2026-08-01.** The prototype's literal builder flow was
 * since built anyway, at the user's explicit request, as
 * `features/dashboard-builder` — new scope beyond the BRD, confirmed via
 * `AskUserQuestion`, not a replacement for this screen. The Administration →
 * Dashboards tab (`AdminTabs.tsx`) now opens that screen instead of this one,
 * so this route is no longer linked from anywhere in the UI. It is left in
 * place, untouched and still the correct FR-ADM-06/07 implementation, in case
 * the tab is ever pointed back here — deleting a working, spec-correct screen
 * to make room for prototype-parity UI was not part of what was asked.
 */
export default function AdminDashboardsPage() {
  return (
    <>
      <PageHeader
        title="Dashboards"
        description="Assign each widget to the roles that should see it, and turn it on or off for everyone."
      />
      <DashboardWidgetsTable />
    </>
  );
}
