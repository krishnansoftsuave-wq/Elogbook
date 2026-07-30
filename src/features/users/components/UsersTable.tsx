"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { DataTable } from "@/components/data-table/DataTable";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { ROLE_LABEL } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { useUsersList } from "@/features/users/api/queries";
import { DeleteUserDialog } from "@/features/users/components/DeleteUserDialog";
import { UserStatusBadge } from "@/features/users/components/UserStatusBadge";
import { UsersFilterBar } from "@/features/users/components/UsersFilterBar";
import { useUserFilters } from "@/features/users/hooks/useUserFilters";
import type { User } from "@/types/user";

import styles from "./UsersTable.module.scss";

const columnHelper = createColumnHelper<User>();

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const UsersTable = () => {
  const { filters, queryFilters, setFilter, reset, isFiltered } =
    useUserFilters();
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { data, isLoading, isFetching } = useUsersList(queryFilters);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", { header: "Name" }),
      columnHelper.accessor("email", { header: "Email" }),
      columnHelper.accessor("role", {
        header: "Role",
        cell: (info) => ROLE_LABEL[info.getValue()],
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <UserStatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor("createdAt", {
        header: "Added",
        cell: (info) => dateFormatter.format(new Date(info.getValue())),
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {/* Links styled as buttons, not `Button`s rendering links. Base UI's
                `Button` assumes a native `<button>` and, told otherwise, stamps
                `role="button"` on the anchor — overriding its implicit `link`
                role and dropping it out of a screen reader's list of links.
                These navigate, so they stay links. The `aria-label` rides along
                unchanged; it is still the accessible name. */}
            <Link
              href={ROUTES.ADMIN.USER_PREVIEW(row.original.id)}
              aria-label={`Preview ${row.original.name}`}
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <Eye aria-hidden />
            </Link>
            <Link
              href={ROUTES.ADMIN.USER_EDIT(row.original.id)}
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
              onClick={() => setUserToDelete(row.original)}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        ),
      }),
    ],
    []
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
        caption="Users, with role, status and the date they were added"
        emptyMessage={
          isFiltered ? "No users match these filters." : "No users yet."
        }
        getRowClassName={(row) =>
          [
            styles.usersTable__row,
            row.original.status === "suspended"
              ? styles["usersTable__row--suspended"]
              : undefined,
          ]
            .filter(Boolean)
            .join(" ")
        }
      />

      <DataTablePagination
        page={filters.page}
        pageSize={filters.pageSize}
        total={data?.total ?? 0}
        disabled={isFetching}
        onPageChange={(page) => setFilter("page", page)}
        onPageSizeChange={(pageSize) => setFilter("pageSize", pageSize)}
      />

      <DeleteUserDialog
        user={userToDelete}
        onClose={() => setUserToDelete(null)}
      />
    </div>
  );
};
