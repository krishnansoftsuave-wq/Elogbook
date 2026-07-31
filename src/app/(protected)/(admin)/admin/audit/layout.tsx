import type { ReactNode } from "react";

import { RoleGuard } from "@/components/layout/RoleGuard";
import { ROUTE_PERMISSIONS } from "@/constants/routes";

/**
 * The `(admin)` layout above requires only `user:read`, which §6.5 gives the
 * Super User. §6.4 gives the Administrator *"review audit and AI-usage logs"*
 * and §6.5 says nothing about audit at all, so this narrows the subtree to the
 * wildcard — matching `GET /audit`, which has been wildcard-gated since Phase
 * 0a. Hiding the nav item is not access control (**FR-ADM-03**); this is.
 */
export default function AdminAuditLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard require={ROUTE_PERMISSIONS.ADMIN_AUDIT.permissions}>
      {children}
    </RoleGuard>
  );
}
