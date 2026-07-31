import type { ReactNode } from "react";

import { RoleGuard } from "@/components/layout/RoleGuard";
import { ROUTE_PERMISSIONS } from "@/constants/routes";

/**
 * §7.9. `shift:read` only — **FR-NOT-01 is "All roles"**, so nothing narrower
 * gates it. The guard is still here for the reason the policy entry exists at
 * all: `homeForSession`, the sidebar filter and the edge proxy all answer from
 * that table, and a route with no entry reads to every one of them as unguarded.
 */
export default function NotificationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard require={ROUTE_PERMISSIONS.NOTIFICATIONS.permissions}>
      {children}
    </RoleGuard>
  );
}
