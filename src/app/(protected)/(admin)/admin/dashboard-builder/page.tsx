import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AdminTabs } from "@/features/admin/components/AdminTabs";
import { DashboardConfigsTable } from "@/features/dashboard-builder/components/DashboardConfigsTable";

export const metadata: Metadata = { title: "Dashboards" };

/**
 * ⚠️ PROTOTYPE-ONLY — no BRD basis. The prototype's `dashList`
 * (`app-source.txt` 2056–2059), built at the user's explicit request
 * (2026-08-01), now what the Administration → Dashboards tab opens.
 * `/admin/dashboards` (`DashboardWidgetsTable`) remains the
 * FR-ADM-06/07-driven screen and is unchanged — it is simply no longer
 * linked from this tab. See `features/dashboard-builder/schemas.ts` for the
 * full gap analysis.
 */
export default function AdminDashboardBuilderPage() {
  return (
    <>
      <PageHeader
        title="Dashboards"
        description="Role-based dashboard builder — one dashboard per role"
      />
      <AdminTabs />
      <DashboardConfigsTable />
    </>
  );
}
