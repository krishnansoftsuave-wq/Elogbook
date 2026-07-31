import type { ReactNode } from "react";

import { RoleGuard } from "@/components/layout/RoleGuard";
import { ROUTE_PERMISSIONS } from "@/constants/routes";

/**
 * `action:read` — §7.6. Nested inside the `(user)` group's `shift:read` guard,
 * which composes: a session needs both.
 *
 * The permission comes from `ROUTE_PERMISSIONS`, the same entry the sidebar
 * filter and the edge proxy read, so a route cannot be guarded in one place and
 * open in another.
 */
export default function ActionsLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard require={ROUTE_PERMISSIONS.ACTIONS.permissions}>
      {children}
    </RoleGuard>
  );
}
