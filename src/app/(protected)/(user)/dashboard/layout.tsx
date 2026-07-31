import type { ReactNode } from "react";

import { RoleGuard } from "@/components/layout/RoleGuard";
import { ROUTE_PERMISSIONS } from "@/constants/routes";

/**
 * `shift:read` — §7.2. The same permission the `(user)` group already requires,
 * so this guard adds nothing a session could fail independently.
 *
 * It is here regardless, for the reason `ROUTE_PERMISSIONS.DASHBOARD` exists at
 * all: the policy table is what `homeForSession`, the sidebar filter and the
 * edge proxy answer from, and a route with no entry reads to all three as
 * unguarded. Deriving the guard from the same entry keeps them in step if the
 * dashboard ever moves out of this group.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard require={ROUTE_PERMISSIONS.DASHBOARD.permissions}>
      {children}
    </RoleGuard>
  );
}
