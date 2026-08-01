"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bot,
  Clock,
  FileText,
  History,
  LayoutDashboard,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Permission } from "@/constants/permissions";
import { ROUTE_PERMISSIONS, ROUTES } from "@/constants/routes";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";
import { modulesFor } from "@/constants/subCategories";
import { useIsWorkflowEnabled } from "@/features/admin/api/queries";
import { useRoleVariant } from "@/features/auth/hooks/useRoleVariant";
import { useSession } from "@/features/auth/hooks/useSession";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** ALL of these are required for the item to appear. */
  permissions: readonly Permission[];
  /**
   * The prototype module this row belongs to (`ROLE_MODULES`). Several rows can
   * share one: the prototype's single `admin` module is three screens here.
   */
  module: string;
}

/**
 * Permission-keyed, not role-keyed: a custom role created through the admin API
 * carries permissions, not a name this build knows (`authentication_flow.md`
 * §5). Each item reuses the same entry from `ROUTE_PERMISSIONS` that guards the
 * route itself, so the menu and the gate cannot drift apart.
 *
 * Filtering here is cosmetic. FR-ADM-03 is satisfied by the layout `RoleGuard`,
 * which blocks the route whether or not its link was ever rendered.
 *
 * `/logbook` was removed from this list in Phase 1a. It is the entries scaffold,
 * whose `/entries` endpoint has no mock handler, so every visit surfaced a
 * connection-error toast. The feature itself stays — `features/users` and
 * `features/entries` are the reference implementations every new feature copies
 * — it simply is not somewhere the demo can route to. `/admin/users` has the
 * same problem and stays anyway: it is the only route Super User's permissions
 * open, and `HOME_CANDIDATES` explains why that matters.
 */
const NAV_ITEMS: readonly NavItem[] = [
  {
    href: ROUTES.DASHBOARD,
    module: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    permissions: ROUTE_PERMISSIONS.DASHBOARD.permissions,
  },
  {
    href: ROUTES.ACTIONS,
    module: "pending",
    label: "Pending actions",
    icon: ListChecks,
    permissions: ROUTE_PERMISSIONS.ACTIONS.permissions,
  },
  {
    href: ROUTES.SUMMARIES,
    module: "summary",
    label: "Shift summaries",
    icon: FileText,
    permissions: ROUTE_PERMISSIONS.SUMMARIES.permissions,
  },
  {
    href: ROUTES.ASSISTANT,
    module: "assistant",
    // The prototype's own label (`app-source.txt` SUPNAV line 3).
    label: "Ask Assistant",
    icon: Bot,
    permissions: ROUTE_PERMISSIONS.ASSISTANT.permissions,
  },
  {
    href: ROUTES.TRENDS,
    module: "trends",
    label: "Trends & KPIs",
    icon: TrendingUp,
    permissions: ROUTE_PERMISSIONS.TRENDS.permissions,
  },
  {
    href: ROUTES.NOTIFICATIONS,
    module: "notifications",
    label: "Notifications",
    icon: Bell,
    permissions: ROUTE_PERMISSIONS.NOTIFICATIONS.permissions,
  },
  {
    href: ROUTES.ADMIN.USERS,
    module: "admin",
    label: "Users",
    icon: Users,
    permissions: ROUTE_PERMISSIONS.ADMIN.permissions,
  },
  {
    href: ROUTES.ADMIN.WORKFLOWS,
    module: "admin",
    label: "Workflows",
    icon: SlidersHorizontal,
    // `access:control`, which both admin-tree roles hold — §6.5 gives the Super
    // User comment and decision-workflow access, so hiding this from them would
    // hide a capability the BRD grants.
    permissions: ROUTE_PERMISSIONS.ADMIN_WORKFLOWS.permissions,
  },
  {
    href: ROUTES.ADMIN.SHIFT_CONFIG,
    module: "admin",
    label: "Shift timings",
    icon: Clock,
    permissions: ROUTE_PERMISSIONS.ADMIN_SHIFT_CONFIG.permissions,
  },
  {
    // The prototype gives Audit Log its own top-level nav row rather than an
    // admin tab (`app-source.txt` 15–16), and so does this.
    href: ROUTES.ADMIN.AUDIT,
    module: "audit",
    label: "Audit log",
    icon: History,
    permissions: ROUTE_PERMISSIONS.ADMIN_AUDIT.permissions,
  },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const { permissions } = useSession();
  const { role, actualRole, isImpersonating } = useRoleVariant();
  const workflowEnabled = useIsWorkflowEnabled("management_decision_workflow");
  const collapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((state) => state.toggleSidebar);

  /*
    Two filters, composed, and the order matters.

    Permission first, unchanged: it reuses each route's own `ROUTE_PERMISSIONS`
    entry so the menu and the guard cannot drift, and it is what keeps a §6
    custom role from smuggling a row in.

    Then the role's module set (`ROLE_MODULES`), which is what gives the
    prototype's five nav sets. It is skipped entirely when this build cannot
    name the session's role — a custom role has no module list, and filtering by
    an empty one would blank the nav rather than fall back to permissions.

    Modules with no route here (`trends`, `reports`, `dashboards`, `decisions`)
    simply match no item, so the splice below can never produce a dead link.
  */
  const modules = modulesFor(role, workflowEnabled);
  const roleKnown = actualRole !== null || isImpersonating;

  const items = NAV_ITEMS.filter(
    (item) =>
      hasPermission(permissions, item.permissions) &&
      (!roleKnown || modules.includes(item.module))
  );

  return (
    <aside
      className={cn(
        // `border-e`, not `border-r`: the inline end flips with `dir`, and the
        // sidebar sits on the right in Arabic (NFR-07).
        "flex shrink-0 flex-col gap-1 border-e bg-sidebar p-3 text-sidebar-foreground transition-[width] max-lg:hidden",
        // Sticks under the 58px top bar and owns the rest of the viewport, as
        // the prototype's rail does (`app-source.txt` 220). `dvh` rather than
        // `vh` so a mobile browser's collapsing toolbar cannot crop it.
        "sticky top-[3.625rem] h-[calc(100dvh-3.625rem)]",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="mb-2 self-end"
        // A toggle, so the name stays put and `aria-pressed` carries the state
        // (DS-10.5). A label that flips instead announces the *action* while
        // the button reports no state at all.
        aria-label="Collapse sidebar"
        aria-pressed={collapsed}
        onClick={toggleSidebar}
      >
        {/* Both glyphs point at a panel on their left, so they mirror with
            `dir` for the same reason the `border-e` above flips (NFR-07). */}
        {collapsed ? (
          <PanelLeftOpen className="rtl:-scale-x-100" aria-hidden />
        ) : (
          <PanelLeftClose className="rtl:-scale-x-100" aria-hidden />
        )}
      </Button>

      {/* The prototype's rows are full-bleed and marked by a 3px bar on their
          leading edge (`app-source.txt` 216–218), not rounded pills — so the
          nav cancels the rail's horizontal padding rather than inheriting it. */}
      <nav aria-label="Main" className="-mx-3 flex flex-col">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                // `border-s`, not `border-l`: the marker sits on the inline
                // start, which moves to the right edge in Arabic (NFR-07).
                "flex items-center gap-3 border-s-[3px] border-transparent px-4 py-2.5 text-[0.84375rem] transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "border-s-sidebar-primary bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "text-sidebar-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              {/* Teal on the active row, muted otherwise — the prototype's own
                  distinction (218). */}
              <Icon
                className={cn(
                  "size-[1.1875rem] shrink-0",
                  isActive ? "text-sidebar-primary" : "text-muted-foreground"
                )}
                aria-hidden
              />
              {/* Hidden, not dropped: unmounting the label leaves an
                  `aria-hidden` icon and `title` as the link's only name, and
                  `title` is the last-resort accname source no major browser
                  surfaces to a keyboard user. `sr-only` is out of flow, so the
                  collapsed rail still centres on the icon alone. */}
              <span className={cn(collapsed && "sr-only")}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/*
        The prototype's `roleControl()` at the foot of the rail
        (`app-source.txt` 221–222, 246–260).

        This is now the **product** control — admin impersonation behind a
        permission gate — rather than the dev-only account picker that stood
        here before. It renders itself only for a session that may impersonate,
        so no `NODE_ENV` fold is needed or wanted: the capability is real and
        ships, gated.
      */}
      <RoleSwitcher collapsed={collapsed} />
    </aside>
  );
};
