"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Permission } from "@/constants/permissions";
import { ROUTE_PERMISSIONS, ROUTES } from "@/constants/routes";
import { useSession } from "@/features/auth/hooks/useSession";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

interface AdminTab {
  href: string;
  label: string;
  /** ALL of these are required for the tab to appear — same rule as the sidebar. */
  permissions: readonly Permission[];
}

/**
 * The prototype's `adminTab` strip (`app-source.txt` 1562, 1565–1566) — one
 * "Administration" entry in the sidebar (`Sidebar.tsx`) fans out to these tabs
 * rather than each getting its own sidebar row, matching the prototype's
 * `admin`/`superuser` nav arrays (lines 15–16).
 *
 * Only tabs this repo has actually built are listed. Roles, Notifications and
 * Dashboards all moved into this list once their routes existed; a disabled
 * placeholder tab for an unbuilt route would invite a click that goes
 * nowhere, so each stays out until it does not.
 *
 * Filtering is cosmetic, exactly as it is in `Sidebar.tsx`: each destination's
 * own `layout.tsx` `RoleGuard` is the actual gate (FR-ADM-03), keyed off the
 * same `ROUTE_PERMISSIONS` entry so the tab and the guard cannot drift apart.
 */
const ADMIN_TABS: readonly AdminTab[] = [
  {
    href: ROUTES.ADMIN.USERS,
    label: "Users",
    permissions: ROUTE_PERMISSIONS.ADMIN.permissions,
  },
  {
    href: ROUTES.ADMIN.ROLES,
    label: "Roles",
    permissions: ROUTE_PERMISSIONS.ADMIN_ROLES.permissions,
  },
  {
    href: ROUTES.ADMIN.WORKFLOWS,
    label: "Workflows",
    permissions: ROUTE_PERMISSIONS.ADMIN_WORKFLOWS.permissions,
  },
  {
    href: ROUTES.ADMIN.SHIFT_CONFIG,
    label: "Configuration",
    permissions: ROUTE_PERMISSIONS.ADMIN_SHIFT_CONFIG.permissions,
  },
  {
    // ⚠️ PROTOTYPE-ONLY destination, unlike every other tab here — the
    // prototype's `dashboards()` list/builder/preview/publish flow
    // (`features/dashboard-builder/schemas.ts`), not the BRD-driven
    // `ROUTES.ADMIN.DASHBOARDS` widget-assignment table it replaced on this
    // tab. That screen still exists and is still the FR-ADM-06/07 contract;
    // it is simply no longer where this tab points.
    href: ROUTES.ADMIN.DASHBOARD_BUILDER.LIST,
    label: "Dashboards",
    permissions: ROUTE_PERMISSIONS.ADMIN_DASHBOARD_BUILDER.permissions,
  },
  {
    href: ROUTES.ADMIN.NOTIFICATIONS,
    label: "Notifications",
    permissions: ROUTE_PERMISSIONS.ADMIN_NOTIFICATIONS.permissions,
  },
];

export const AdminTabs = () => {
  const pathname = usePathname();
  const { permissions } = useSession();

  const tabs = ADMIN_TABS.filter((tab) =>
    hasPermission(permissions, tab.permissions)
  );

  if (tabs.length <= 1) return null;

  return (
    <nav aria-label="Administration" className="mb-4 overflow-x-auto border-b">
      <div className="flex w-max min-w-full gap-1">
        {tabs.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "border-b-2 px-4 py-2 text-sm whitespace-nowrap transition-colors",
                isActive
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
