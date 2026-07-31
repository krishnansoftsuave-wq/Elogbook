import type { ReactNode } from "react";

import { RoleGuard } from "@/components/layout/RoleGuard";
import { ROUTE_PERMISSIONS } from "@/constants/routes";

/**
 * Narrows the admin subtree to the wildcard. §6.4 gives the Administrator
 * *"Configure shift timings; report and summary generation follows configured
 * times"*; §6.5's Super User bullets say nothing about it, and
 * `PUT /admin/shift-config` already takes the wildcard — so a Super User who
 * reached this form would meet a Save button that 403s.
 */
export default function AdminShiftConfigLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard require={ROUTE_PERMISSIONS.ADMIN_SHIFT_CONFIG.permissions}>
      {children}
    </RoleGuard>
  );
}
