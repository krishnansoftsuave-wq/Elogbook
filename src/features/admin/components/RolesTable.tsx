"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { DataTable } from "@/components/data-table/DataTable";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import { ROUTES } from "@/constants/routes";
import { useRoles } from "@/features/admin/api/queries";
import { DeleteRoleDialog } from "@/features/admin/components/DeleteRoleDialog";
import type { AdminRole } from "@/features/admin/schemas";

const columnHelper = createColumnHelper<AdminRole>();

const memberCountLabel = (count: number): string =>
  count === 1 ? "1 user" : `${count} users`;

/**
 * §6 / FR-ADM-02 — the Roles admin table (`app-source.txt` 1568–1579): the
 * base roles plus any Administrator-created custom roles, each mapped to one
 * AD group.
 *
 * **Delete confirms, unlike the prototype.** Its own delete button skips a
 * confirmation and fires straight into a "role in use" toast; this repo's own
 * convention (`DeleteEntryDialog`) always confirms a destructive action, so
 * `DeleteRoleDialog` asks first and still surfaces the same server-side block
 * for a base role or one with members.
 *
 * **Paginated client-side, not server-side.** `useRoles` fetches the whole
 * list (`MAX_PAGE_SIZE`, see that hook's own comment), so there is no page to
 * request from the server — but the prototype still renders `pager()`
 * unconditionally under the table (`app-source.txt` 1580), so this slices the
 * already-fetched list locally to match that rendered shape instead of
 * dropping the control because this build's list never grows a second page.
 */
export const RolesTable = () => {
  const [roleToDelete, setRoleToDelete] = useState<AdminRole | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { data, isLoading } = useRoles();

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", { header: "Role" }),
      columnHelper.accessor("memberCount", {
        header: "Members",
        cell: (info) => (
          <span className="text-muted-foreground">
            {memberCountLabel(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("adGroup", {
        header: "AD Group",
        cell: (info) => (
          <span className="font-mono text-xs text-primary">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => (
          <Badge
            variant={info.getValue() === "custom" ? "secondary" : "outline"}
          >
            {info.getValue() === "custom" ? "Custom" : "Base"}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Link
              href={ROUTES.ADMIN.ROLE_EDIT(row.original.id)}
              aria-label={`Edit ${row.original.name}`}
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <Pencil aria-hidden />
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Delete ${row.original.name}`}
              onClick={() => setRoleToDelete(row.original)}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        ),
      }),
    ],
    []
  );

  const total = data?.length ?? 0;
  const pageStart = (page - 1) * pageSize;
  const pagedData = useMemo(
    () => (data ?? []).slice(pageStart, pageStart + pageSize),
    [data, pageStart, pageSize]
  );

  const table = useReactTable({
    data: pagedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
  });

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        table={table}
        isLoading={isLoading}
        caption="Every role the platform recognises, its AD group mapping, member count and whether it is a base or Administrator-created custom role"
        emptyMessage="No roles have been configured yet."
      />

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <DeleteRoleDialog
        role={roleToDelete}
        onClose={() => setRoleToDelete(null)}
      />
    </div>
  );
};
