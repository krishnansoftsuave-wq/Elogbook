import type { ReactNode } from "react";

import { RoleGuard } from "@/components/layout/RoleGuard";
import { ROUTE_PERMISSIONS } from "@/constants/routes";

/**
 * `summary:read` — §7.5. Nested inside the `(user)` group's `shift:read` guard,
 * which composes: a session needs both, which is exactly what
 * `ROUTE_PERMISSIONS.SUMMARIES` records so the redirect logic can see it too.
 */
export default function SummariesLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard require={ROUTE_PERMISSIONS.SUMMARIES.permissions}>
      {children}
    </RoleGuard>
  );
}
