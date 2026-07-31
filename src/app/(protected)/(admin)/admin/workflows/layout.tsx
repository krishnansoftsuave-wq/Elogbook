import type { ReactNode } from "react";

import { RoleGuard } from "@/components/layout/RoleGuard";
import { ROUTE_PERMISSIONS } from "@/constants/routes";

/**
 * A second guard inside the admin tree, and the first route that needs one.
 *
 * The `(admin)` layout above requires only `user:read`, which every operational
 * role lacks but which alone says nothing about configuring the platform. This
 * narrows the subtree to `access:control` — the permission §6 grants the Super
 * User for *"access to comments and the decision workflow"* and which an
 * Administrator holds through the wildcard. Hiding the nav item is not access
 * control (**FR-ADM-03**); this is.
 *
 * It gates the **screen**, not the individual switches: two of the four are
 * Administrator-only (FR-PA-05), and that finer question is `WORKFLOW_PERMISSION`'s,
 * enforced by `PATCH /admin/workflows`.
 *
 * The requirement is read from `ROUTE_PERMISSIONS.ADMIN_WORKFLOWS`, the same
 * entry the sidebar filter and `homeForSession` read, so the gate and the menu
 * cannot drift apart.
 */
export default function AdminWorkflowsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard require={ROUTE_PERMISSIONS.ADMIN_WORKFLOWS.permissions}>
      {children}
    </RoleGuard>
  );
}
