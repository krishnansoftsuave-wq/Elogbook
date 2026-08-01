import type { ReactNode } from "react";

import { RoleGuard } from "@/components/layout/RoleGuard";
import { ROUTE_PERMISSIONS } from "@/constants/routes";

/**
 * §6.4 / FR-NOT-01. Narrows the `(admin)` group's `user:read` down to the
 * wildcard, the same posture `admin/roles` and `admin/shift-config` take:
 * §6.5 names no permission short of the wildcard that would let a Super
 * User or custom role reach it.
 */
export default function AdminNotificationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard require={ROUTE_PERMISSIONS.ADMIN_NOTIFICATIONS.permissions}>
      {children}
    </RoleGuard>
  );
}
