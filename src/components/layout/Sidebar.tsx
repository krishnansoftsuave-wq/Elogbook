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
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Permission } from "@/constants/permissions";
import { ROUTE_PERMISSIONS, ROUTES } from "@/constants/routes";
import { DevRoleSwitcher } from "@/features/auth/components/DevRoleSwitcher";
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
    label: "Dashboard",
    icon: LayoutDashboard,
    permissions: ROUTE_PERMISSIONS.DASHBOARD.permissions,
  },
  {
    href: ROUTES.ACTIONS,
    label: "Pending actions",
    icon: ListChecks,
    permissions: ROUTE_PERMISSIONS.ACTIONS.permissions,
  },
  {
    href: ROUTES.SUMMARIES,
    label: "Shift summaries",
    icon: FileText,
    permissions: ROUTE_PERMISSIONS.SUMMARIES.permissions,
  },
  {
    href: ROUTES.ASSISTANT,
    // The prototype's own label (`app-source.txt` SUPNAV line 3).
    label: "Ask Assistant",
    icon: Bot,
    permissions: ROUTE_PERMISSIONS.ASSISTANT.permissions,
  },
  {
    href: ROUTES.NOTIFICATIONS,
    label: "Notifications",
    icon: Bell,
    permissions: ROUTE_PERMISSIONS.NOTIFICATIONS.permissions,
  },
  {
    href: ROUTES.ADMIN.USERS,
    label: "Users",
    icon: Users,
    permissions: ROUTE_PERMISSIONS.ADMIN.permissions,
  },
  {
    href: ROUTES.ADMIN.WORKFLOWS,
    label: "Workflows",
    icon: SlidersHorizontal,
    // `access:control`, which both admin-tree roles hold — §6.5 gives the Super
    // User comment and decision-workflow access, so hiding this from them would
    // hide a capability the BRD grants.
    permissions: ROUTE_PERMISSIONS.ADMIN_WORKFLOWS.permissions,
  },
  {
    href: ROUTES.ADMIN.SHIFT_CONFIG,
    label: "Shift timings",
    icon: Clock,
    permissions: ROUTE_PERMISSIONS.ADMIN_SHIFT_CONFIG.permissions,
  },
  {
    // The prototype gives Audit Log its own top-level nav row rather than an
    // admin tab (`app-source.txt` 15–16), and so does this.
    href: ROUTES.ADMIN.AUDIT,
    label: "Audit log",
    icon: History,
    permissions: ROUTE_PERMISSIONS.ADMIN_AUDIT.permissions,
  },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const { permissions } = useSession();
  const collapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((state) => state.toggleSidebar);

  const items = NAV_ITEMS.filter((item) =>
    hasPermission(permissions, item.permissions)
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
        The prototype's `roleControl()` sits at the foot of the rail
        (`app-source.txt` 221–222, 246). **Dev-only scaffolding**, not the
        product's role switcher — that one is admin impersonation behind a
        permission gate and is still unbuilt.

        The guard is repeated here rather than left to the component's own early
        return, and that repetition is the point: `process.env.NODE_ENV` is a
        build-time literal, so in a production bundle this reads
        `"production" !== "production"`, the JSX is dead, `DevRoleSwitcher`
        becomes an unused binding, and the module is dropped from the bundle
        instead of shipped as a component that returns null.
      */}
      {process.env.NODE_ENV !== "production" && (
        <DevRoleSwitcher collapsed={collapsed} />
      )}
    </aside>
  );
};
