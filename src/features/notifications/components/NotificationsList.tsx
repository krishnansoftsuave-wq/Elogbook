"use client";

import { useState } from "react";
import { Inbox, TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import { useNotificationsList } from "@/features/notifications/api/queries";
import { NotificationItem } from "@/features/notifications/components/NotificationItem";
import type { NotificationFilters } from "@/features/notifications/types";
import { cn } from "@/lib/utils";

/**
 * The full notification list — **FR-NOT-01**, the prototype's `notifications`
 * screen (`app-source.txt` 1846–1873).
 *
 * ## Not a DataTable
 *
 * A notification is a message, not a record with columns. The prototype renders
 * a list and so does this; `DataTablePagination` is reused because the paging
 * behaviour is identical even though the rows are not.
 *
 * ## "Mark all read" is deliberately absent
 *
 * The prototype has it (1849). There is **no bulk endpoint** — only
 * `POST /notifications/:id/read` — so implementing it means looping N writes
 * from the browser. That is not the same operation: it can half-fail, and it
 * writes N audit events for one human act, which is the exact shape Phase 1c's
 * duplicate-feedback defect took. It needs a contract
 * (`POST /notifications/read-all`), and until then the button is omitted rather
 * than faked.
 *
 * ## Two things the prototype shows that are not real
 *
 * Its right-hand column carries a "Notification settings" card listing channels
 * per kind, and a "This week" panel with hardcoded `'8'` actioned and `'3.4 h'`
 * average response (1862–1871). The first is **FR-NOT-01's Administrator
 * matrix** — `/admin/notification-permissions`, wildcard-gated, and a Phase 3
 * screen. The second is invented analytics. Neither is ported.
 */

const INITIAL_FILTERS: NotificationFilters = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  unreadOnly: false,
};

export const NotificationsList = () => {
  const [filters, setFilters] = useState<NotificationFilters>(INITIAL_FILTERS);
  const { data, isLoading, isFetching, isError } =
    useNotificationsList(filters);

  const setFilter = <TKey extends keyof NotificationFilters>(
    key: TKey,
    value: NotificationFilters[TKey]
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      // Switching tab while on page 3 would otherwise land on an empty page
      // that reads as "nothing unread".
      ...(key === "page" ? {} : { page: 1 }),
    }));
  };

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/*
        The prototype's All / Unread tabs (1852). A real toggle group rather than
        `Tabs`, because switching does not reveal a second panel — it refetches
        the same one with a different filter.
      */}
      <div
        role="group"
        aria-label="Filter notifications"
        className="flex flex-wrap gap-2"
      >
        {(
          [
            { label: "All", unreadOnly: false },
            { label: "Unread", unreadOnly: true },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.label}
            type="button"
            size="sm"
            variant={
              filters.unreadOnly === tab.unreadOnly ? "default" : "ghost"
            }
            aria-pressed={filters.unreadOnly === tab.unreadOnly}
            onClick={() => setFilter("unreadOnly", tab.unreadOnly)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className={cn("p-2", isLoading && "p-4")}>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : isError ? (
            /*
              Checked before the empty state, because "No notifications yet" on a
              failed request is not an empty state — it is a false statement
              about the user's inbox.
            */
            <p
              role="alert"
              className="flex items-start gap-2 px-3 py-6 text-sm text-destructive"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              Notifications could not be loaded. Reload to try again.
            </p>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={
                filters.unreadOnly ? "Nothing unread" : "No notifications yet"
              }
              description={
                filters.unreadOnly
                  ? "You are up to date."
                  : "Assignments, overdue actions and new summaries appear here."
              }
            />
          ) : (
            <ul className="flex flex-col">
              {items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <DataTablePagination
        page={filters.page}
        pageSize={filters.pageSize}
        total={data?.total ?? 0}
        disabled={isFetching}
        onPageChange={(page) => setFilter("page", page)}
        onPageSizeChange={(pageSize) => setFilter("pageSize", pageSize)}
      />

      {/*
        FR-NOT-01 is "in-app **and by email**". Half of it is not a frontend
        capability at all — an SMTP relay (§3.3) — and saying so is better than
        a screen that implies both are working.
      */}
      <p className="text-2xs text-muted-foreground">
        Email delivery is handled by the platform&apos;s mail relay and is not
        shown here (FR-NOT-01).
      </p>
    </div>
  );
};
