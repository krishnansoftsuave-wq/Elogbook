import type { ReactNode } from "react";

import { RoleGuard } from "@/components/layout/RoleGuard";
import { ROUTE_PERMISSIONS } from "@/constants/routes";

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard require={ROUTE_PERMISSIONS.LOGBOOK.permissions}>
      {children}
    </RoleGuard>
  );
}
