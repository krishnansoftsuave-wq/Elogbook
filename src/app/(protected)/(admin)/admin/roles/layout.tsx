import type { ReactNode } from "react";

import { RoleGuard } from "@/components/layout/RoleGuard";
import { ROUTE_PERMISSIONS } from "@/constants/routes";

/**
 * §6 / FR-ADM-02. Narrows the `(admin)` group's `user:read` down to the
 * wildcard, the same posture `admin/audit` and `admin/shift-config` take:
 * role membership and AD group mapping are the platform's own access model,
 * and §6.5 names no permission short of the wildcard that would let a Super
 * User or custom role reach it.
 */
export default function AdminRolesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard require={ROUTE_PERMISSIONS.ADMIN_ROLES.permissions}>
      {children}
    </RoleGuard>
  );
}
