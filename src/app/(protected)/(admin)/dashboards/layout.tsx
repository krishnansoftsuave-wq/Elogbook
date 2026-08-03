import type { ReactNode } from "react";

import { RoleGuard } from "@/components/layout/RoleGuard";
import { ROUTE_PERMISSIONS } from "@/constants/routes";

/**
 * `dashboard:configure` — §7.12. The permission §6.5 grants the Super User for
 * *"configure dashboards … assign widgets to roles"*, and which an
 * Administrator holds through the wildcard (**FR-ADM-07**).
 *
 * It sits in the `(admin)` route group for company, not for its guard: the
 * group has no layout of its own, so this is the only gate above the screen and
 * `ROUTE_PERMISSIONS.DASHBOARDS` records the effective requirement in full.
 *
 * Hiding the nav item is not access control (**FR-ADM-03**); this is.
 */
export default function DashboardsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard require={ROUTE_PERMISSIONS.DASHBOARDS.permissions}>
      {children}
    </RoleGuard>
  );
}
