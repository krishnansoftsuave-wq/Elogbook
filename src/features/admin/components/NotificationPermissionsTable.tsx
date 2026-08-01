"use client";

import { useMemo, useState } from "react";
import { BellRing, Download, Lock } from "lucide-react";
import { toast } from "sonner";

import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import { useUpdateNotificationPermission } from "@/features/admin/api/mutations";
import { useNotificationPermissions } from "@/features/admin/api/queries";
import {
  NOTIFICATION_PERMISSION_KEYS,
  NOTIFICATION_PERMISSION_LABEL,
  type ChannelPermission,
  type NotificationPermission,
  type NotificationPermissionKey,
} from "@/features/admin/schemas";

/** `{ username: { key: { in_app, email } } }` — the row's unsaved toggle state. */
type DraftPermissions = Record<
  string,
  Record<NotificationPermissionKey, ChannelPermission>
>;

/**
 * **§6.4 / FR-NOT-01** — "Control, per user, which notifications each user
 * may view / receive."
 *
 * Ported from `adminNotifPerm` (`app-source.txt` 2022–2041): one row per
 * user, four notification types, an In-app / Email pair per type, and a
 * per-row Save that submits the whole row at once (`togPerm` flips a cell
 * locally; the row's own "Save" button is what reaches the server).
 *
 * **Local draft state, not optimistic mutation.** A `Switch` flips
 * immediately because that is what the prototype's own toggles do, but
 * nothing reaches the server until Save — the same reason `RoleForm` is a
 * form rather than a mutate-per-field grid: a matrix of forty-plus checkboxes
 * firing one request per click would make this screen unusable on the
 * NFR-08 plant-floor tablets, and it would leave no "did I mean to change
 * that" moment for a control that decides who is told about an overdue
 * safety action.
 *
 * **Paginated client-side, not server-side**, same as `RolesTable`:
 * `useNotificationPermissions` fetches the whole list (`MAX_PAGE_SIZE`), so
 * this slices it locally to match the prototype's unconditional `pager()`
 * (`app-source.txt` 2041).
 *
 * **Export fires a toast, same as the prototype's `adminNotifPerm`** (line
 * 2041) — no export endpoint exists in this build, unlike `AuditTable` /
 * `SummaryExportMenu`, which disable or omit the same prototype pattern for
 * that reason. This one matches the prototype exactly by product decision.
 */
export const NotificationPermissionsTable = () => {
  const { data, isLoading, isError } = useNotificationPermissions();
  const updatePermission = useUpdateNotificationPermission();
  const [draft, setDraft] = useState<DraftPermissions>({});
  const [savingUsername, setSavingUsername] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const allRows = useMemo(() => data ?? [], [data]);
  const total = allRows.length;
  const pageStart = (page - 1) * pageSize;
  const rows = useMemo(
    () => allRows.slice(pageStart, pageStart + pageSize),
    [allRows, pageStart, pageSize]
  );

  const permissionsFor = (
    row: NotificationPermission
  ): Record<NotificationPermissionKey, ChannelPermission> =>
    draft[row.username] ?? row.permissions;

  const toggle = (
    row: NotificationPermission,
    key: NotificationPermissionKey,
    channel: "in_app" | "email"
  ) => {
    const current = permissionsFor(row);
    setDraft((previous) => ({
      ...previous,
      [row.username]: {
        ...current,
        [key]: { ...current[key], [channel]: !current[key][channel] },
      },
    }));
  };

  const save = (row: NotificationPermission) => {
    setSavingUsername(row.username);
    updatePermission.mutate(
      { username: row.username, values: { permissions: permissionsFor(row) } },
      { onSettled: () => setSavingUsername(null) }
    );
  };

  if (isError) {
    return (
      <p
        role="alert"
        className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
      >
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        Notification permissions could not be loaded, so they cannot be shown or
        changed. Reload to try again.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-4.25 text-primary" aria-hidden />
          Per-User Notification Permissions
        </CardTitle>
        <CardAction>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => toast.info("Exported notification matrix")}
          >
            <Download aria-hidden />
            Export
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="mb-4 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
          <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          You control which notifications each user can view and receive.
          Changes take effect immediately once saved.
        </p>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={`notif-perm-skeleton-${index}`}
                className="h-12 w-full"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <Table>
              <caption className="sr-only">
                Which notifications each user is permitted to view or receive,
                in-app and by email
              </caption>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className="text-[0.625rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    User
                  </TableHead>
                  <TableHead className="text-[0.625rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    Role
                  </TableHead>
                  {NOTIFICATION_PERMISSION_KEYS.map((key) => (
                    <TableHead
                      key={key}
                      className="text-center text-[0.625rem] font-semibold tracking-wide text-muted-foreground uppercase"
                    >
                      <div>{NOTIFICATION_PERMISSION_LABEL[key]}</div>
                      <div className="mt-0.5 text-[0.5625rem] font-medium tracking-normal normal-case">
                        In-app / Email
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center">
                    <span className="sr-only">Save</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={NOTIFICATION_PERMISSION_KEYS.length + 3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No users have notification permissions configured yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const permissions = permissionsFor(row);
                    const isSaving = savingUsername === row.username;

                    return (
                      <TableRow key={row.username}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {row.displayName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{row.roleLabel}</Badge>
                        </TableCell>
                        {NOTIFICATION_PERMISSION_KEYS.map((key) => (
                          <TableCell key={key}>
                            <div className="flex justify-center gap-2">
                              <Switch
                                size="sm"
                                aria-label={`${row.displayName} — ${NOTIFICATION_PERMISSION_LABEL[key]}, in-app`}
                                checked={permissions[key].in_app}
                                disabled={isSaving}
                                onCheckedChange={() =>
                                  toggle(row, key, "in_app")
                                }
                              />
                              <Switch
                                size="sm"
                                aria-label={`${row.displayName} — ${NOTIFICATION_PERMISSION_LABEL[key]}, email`}
                                checked={permissions[key].email}
                                disabled={isSaving}
                                onCheckedChange={() =>
                                  toggle(row, key, "email")
                                }
                              />
                            </div>
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isSaving}
                            onClick={() => save(row)}
                          >
                            {isSaving ? "Saving…" : "Save"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && (
          <div className="mt-4">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};
