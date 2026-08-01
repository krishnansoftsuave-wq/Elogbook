"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  getCoreRowModel,
  type Row,
  useReactTable,
} from "@tanstack/react-table";
import { Eye, UserRoundCheck, UserRoundX } from "lucide-react";

import { DataTable } from "@/components/data-table/DataTable";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { roleLabel } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/features/auth/hooks/useSession";
import { useUsersList } from "@/features/users/api/queries";
import { UserAccessDialog } from "@/features/users/components/UserAccessDialog";
import { UserStatusBadge } from "@/features/users/components/UserStatusBadge";
import { UsersFilterBar } from "@/features/users/components/UsersFilterBar";
import { useUserFilters } from "@/features/users/hooks/useUserFilters";
import type { UserFilters } from "@/features/users/types";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import type { User } from "@/types/user";

const columnHelper = createColumnHelper<User>();

/**
 * Dims a suspended user's row and marks it with a rule down the leading edge.
 * Hovering or focusing anything inside restores full opacity, so a dimmed row is
 * never harder to read than a normal one while you are working in it.
 *
 * This was a CSS Module until the owner ratified `DS-9.8` ("No CSS Modules or
 * styled-components — Tailwind is the single styling approach") on 2026-07-31.
 * Two details survived the port deliberately:
 *
 * - **`box-shadow`, not `border-inline-start`.** An inset shadow costs no
 *   layout. A 2px border on the first cell would push that cell's text out of
 *   alignment with every unsuspended row above and below it.
 * - **The `rtl:` variant is not decoration.** `box-shadow` has no logical form,
 *   so the mirrored offset is written by hand. The SCSS this replaced was
 *   hard-pinned to the left edge and would have marked the wrong side of the row
 *   under NFR-07's Arabic layout — a latent defect, fixed in passing.
 *
 * Opacity alone would fail WCAG 1.4.1; the row also carries a `UserStatusBadge`
 * reading "Suspended", which is the non-colour signal.
 *
 * Hoisted out of the component so the prop identity is stable across renders
 * (`DS-3.11`).
 */
const rowClassName = (row: Row<User>) =>
  cn(
    "transition-opacity duration-150 ease-in-out",
    row.original.status === "suspended" && [
      "opacity-60 hover:opacity-100 focus-within:opacity-100",
      "[&>td:first-child]:shadow-[inset_2px_0_0_0_var(--destructive)]",
      "rtl:[&>td:first-child]:shadow-[inset_-2px_0_0_0_var(--destructive)]",
    ]
  );

/**
 * The admin directory — **FR-ADM-01**, read as a mirror of Active Directory.
 *
 * ## Why both AD groups and roles are columns
 *
 * Roles are derived from groups (**FR-AUTH-02**, `rolesForGroups`), so showing
 * both looks redundant until the derivation produces nothing: an account in a
 * group this platform does not map lands here with groups and **no role**, which
 * is precisely §5's deny path. Two columns make that visible on the list instead
 * of only after somebody reports they cannot sign in.
 *
 * ## What is not here
 *
 * No Add, no Edit, no Delete. `last_seen_at` is on the preview rather than in a
 * column — nothing writes it yet, so it would read "Never" on every row and buy
 * width with no information.
 */
interface UsersTableProps {
  /**
   * Parsed from the page's own `searchParams`, server-side — a bookmarked or
   * shared users URL should land on the same filtered view it was copied
   * from, not the defaults. See `useUserFilters` for why that read happens in
   * the page rather than via `useSearchParams()` here.
   */
  initialFilters: UserFilters;
}

export const UsersTable = ({ initialFilters }: UsersTableProps) => {
  const { filters, queryFilters, setFilter, reset, isFiltered } =
    useUserFilters(initialFilters);
  const [userToChange, setUserToChange] = useState<User | null>(null);
  const { permissions } = useSession();

  /*
    §6.5 gives the Super User "Can view users" and nothing more, and `PATCH
    /users/:username` takes the wildcard. Hiding the control is the UI half of
    FR-ADM-03 — the handler's 403 is the half that actually enforces it.
  */
  const mayChangeAccess = hasPermission(permissions, WILDCARD_PERMISSION);

  const { data, isLoading, isFetching } = useUsersList(queryFilters);

  const columns = useMemo(
    () => [
      columnHelper.accessor("displayName", {
        header: "Name",
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-medium">{info.getValue()}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {info.row.original.username}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor("adGroups", {
        header: "AD groups",
        cell: (info) => (
          <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            {info.getValue().map((group) => (
              <li key={group} className="font-mono">
                {group}
              </li>
            ))}
          </ul>
        ),
      }),
      columnHelper.accessor("roles", {
        header: "Roles",
        cell: (info) => {
          const roles = info.getValue();
          if (roles.length === 0) {
            return (
              // Not an empty cell: an account whose groups map to no platform
              // role is denied at sign-in (§5), and that is worth saying.
              <span className="text-xs text-muted-foreground italic">
                No platform role
              </span>
            );
          }
          return (
            <div className="flex flex-wrap gap-1">
              {roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {roleLabel(role)}
                </Badge>
              ))}
            </div>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <UserStatusBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {/* A link styled as a button, not a `Button` rendering a link. Base
                UI's `Button` assumes a native `<button>` and, told otherwise,
                stamps `role="button"` on the anchor — overriding its implicit
                `link` role and dropping it out of a screen reader's list of
                links. This navigates, so it stays a link. */}
            <Link
              href={ROUTES.ADMIN.USER_PREVIEW(row.original.username)}
              aria-label={`Preview ${row.original.displayName}`}
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <Eye aria-hidden />
            </Link>
            {mayChangeAccess ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={
                  row.original.status === "active"
                    ? `Suspend ${row.original.displayName}`
                    : `Restore access for ${row.original.displayName}`
                }
                onClick={() => setUserToChange(row.original)}
              >
                {row.original.status === "active" ? (
                  <UserRoundX aria-hidden />
                ) : (
                  <UserRoundCheck aria-hidden />
                )}
              </Button>
            ) : null}
          </div>
        ),
      }),
    ],
    [mayChangeAccess]
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    // The server does the paging; the table must not re-slice the rows.
    manualPagination: true,
    manualFiltering: true,
    rowCount: data?.total ?? 0,
  });

  return (
    <div className="flex flex-col gap-4">
      <UsersFilterBar
        filters={filters}
        isFiltered={isFiltered}
        onChange={setFilter}
        onReset={reset}
      />

      <DataTable
        table={table}
        isLoading={isLoading}
        caption="Everyone Active Directory has given access to this platform, with their AD groups, the roles those groups map to, and whether they may sign in"
        emptyMessage={
          isFiltered
            ? "No users match these filters."
            : "No accounts have been mapped to this platform yet."
        }
        getRowClassName={rowClassName}
      />

      <DataTablePagination
        page={filters.page}
        pageSize={filters.pageSize}
        total={data?.total ?? 0}
        disabled={isFetching}
        onPageChange={(page) => setFilter("page", page)}
        onPageSizeChange={(pageSize) => setFilter("pageSize", pageSize)}
      />

      <UserAccessDialog
        user={userToChange}
        onClose={() => setUserToChange(null)}
      />
    </div>
  );
};
