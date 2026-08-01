import type { ReactNode } from "react";

import { RoleGuard } from "@/components/layout/RoleGuard";
import { ROUTE_PERMISSIONS } from "@/constants/routes";

/**
 * ⚠️ PROTOTYPE-ONLY — no BRD basis, unlike `admin/dashboards/layout.tsx`.
 * Same shape and same permission as that layout: `dashboard:configure` is
 * the same actors configuring dashboards, just through the prototype's
 * fuller flow instead of the simple assignment table. See
 * `features/dashboard-builder/schemas.ts`.
 */
export default function AdminDashboardBuilderLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard require={ROUTE_PERMISSIONS.ADMIN_DASHBOARD_BUILDER.permissions}>
      {children}
    </RoleGuard>
  );
}
