import type { ReactNode } from "react";

import { RoleGuard } from "@/components/layout/RoleGuard";
import { ROUTE_PERMISSIONS } from "@/constants/routes";

/**
 * `assistant:query` — §7.4. Nested inside the `(user)` group's `shift:read`
 * guard, which composes: a session needs both, which is exactly what
 * `ROUTE_PERMISSIONS.ASSISTANT` records so the redirect logic can see it too.
 */
export default function AssistantLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard require={ROUTE_PERMISSIONS.ASSISTANT.permissions}>
      {children}
    </RoleGuard>
  );
}
