import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { WidgetRoleMatrix } from "@/features/dashboards/components/WidgetRoleMatrix";

export const metadata: Metadata = { title: "Dashboard configuration" };

/**
 * §7.12 — dashboard configuration and personalisation.
 *
 * The Super User's screen (§6.5, **FR-ADM-06**): which widgets exist, which
 * roles see each one, and whether it is published at all. **FR-DASH-01**'s
 * standardisation lives here — a dashboard is predefined per role rather than
 * assembled by whoever is looking at it, and **FR-ADM-07** is explicit that
 * *"regular users do not have full dashboard-creation access"*.
 *
 * `WidgetRoleMatrix` carries the account of why only three roles are
 * configurable and how assignments outside them are preserved.
 */
export default function DashboardsPage() {
  return (
    <>
      <PageHeader
        title="Dashboard configuration"
        description="Choose which widgets each role sees. Changes apply to everyone in that role."
      />
      <WidgetRoleMatrix />
    </>
  );
}
