import type { ReactNode } from "react";

import { RoleGuard } from "@/components/layout/RoleGuard";
import { ROUTE_PERMISSIONS } from "@/constants/routes";

/**
 * §7.12 / FR-ADM-06 — the widget-to-role assignment screen. Narrows the
 * `(admin)` group's `user:read` to `dashboard:configure`, same shape as
 * `admin/workflows/layout.tsx`: the Super User holds the permission directly,
 * an Administrator through the wildcard, and every other role is turned back
 * here rather than at a hidden nav item (FR-ADM-03).
 */
export default function AdminDashboardsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard require={ROUTE_PERMISSIONS.ADMIN_DASHBOARDS.permissions}>
      {children}
    </RoleGuard>
  );
}
