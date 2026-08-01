"use client";

import { useState } from "react";
import {
  Bell,
  BellOff,
  CalendarClock,
  CheckCheck,
  Settings2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/EmptyState";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/constants/api";
import { useMarkNotificationRead } from "@/features/notifications/api/mutations";
import { useNotificationsList } from "@/features/notifications/api/queries";
import { NotificationItem } from "@/features/notifications/components/NotificationItem";
import type { NotificationFilters } from "@/features/notifications/types";
import { useNow } from "@/hooks/useNow";
import { cn } from "@/lib/utils";

/**
 * The full notification list — **FR-NOT-01**, the prototype's `notifications`
 * screen (`app-source.txt` 1846–1873).
 *
 * The prototype's layout is a two-column page: the list on the left, and a
 * right-hand column carrying "Mark all read" (in the header), a per-kind
 * "Notification settings" card, and a "This week" stat panel. All three are
 * ported below (`MarkAllReadButton`, `NotificationSettingsCard`,
 * `ThisWeekCard`) for visual parity; see each for what is real data and what
 * is static content carried over from the prototype as-is.
 *
 * ## Not a DataTable
 *
 * A notification is a message, not a record with columns. The prototype
 * renders a list and so does this; `DataTablePagination` is reused because
 * the paging behaviour is identical even though the rows are not.
 */

const INITIAL_FILTERS: NotificationFilters = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  unreadOnly: false,
};

/**
 * The prototype's header "Mark all read" (`app-source.txt` 1849). There is no
 * bulk endpoint — only `POST /notifications/:id/read` — so this loops the
 * same mutation a row's own click uses, one request per currently-unread
 * notification, and lets each one invalidate the shared list/tray queries as
 * it lands. Rendered from `NotificationsPage` via `PageHeader`'s `actions`
 * slot, matching the prototype's placement in the page header row.
 *
 * **Same query, same params, as `ThisWeekCard`'s — deliberately.** This
 * button and that card both mount on first paint and both want "every
 * notification this user has"; an earlier version asked the server to do the
 * unread filtering (`unreadOnly: true`) instead of filtering the fetched page
 * client-side, which put a *different* cache key on the wire and turned one
 * page load into two full `pageSize=100` requests where React Query would
 * otherwise have deduped one.
 */
export const MarkAllReadButton = () => {
  const { data, isFetching } = useNotificationsList({
    page: 1,
    pageSize: MAX_PAGE_SIZE,
    unreadOnly: false,
  });
  const markRead = useMarkNotificationRead();

  const unreadIds =
    data?.items.filter((item) => !item.read).map((item) => item.id) ?? [];

  const markAll = async () => {
    const results = await Promise.allSettled(
      unreadIds.map((id) => markRead.mutateAsync(id))
    );
    // Per-id failures already surface through the mutation's own error toast
    // (see useMarkNotificationRead); this one is only for the act as a whole
    // succeeding, mirroring the prototype's own toast on this button.
    if (results.length > 0 && results.every((r) => r.status === "fulfilled")) {
      toast.success("All notifications marked read");
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={markAll}
      disabled={isFetching || markRead.isPending || unreadIds.length === 0}
    >
      <CheckCheck aria-hidden />
      Mark all read
    </Button>
  );
};

/**
 * The prototype's settings list (`app-source.txt` 1861, 1863) — fixed copy,
 * not fetched or computed, so it lives here rather than behind a data layer.
 * The real per-user matrix is `/admin/notification-permissions`, wildcard-gated
 * (Administrator only) with no self-read form yet for a signed-in user to view
 * their own row; that is Phase 3. The switch itself is real and locally
 * interactive (flips per row on click), but nothing persists it — there is
 * nowhere to write. Every row starts "on", matching "You currently receive".
 */
const NOTIFICATION_SETTINGS: readonly { label: string; channels: string }[] = [
  { label: "Action assigned to me", channels: "In-app, Email" },
  { label: "Action overdue", channels: "In-app" },
  { label: "Summary report ready", channels: "In-app" },
  { label: "Report ready", channels: "In-app" },
  { label: "AI suggestions", channels: "In-app, Email" },
];

const NotificationSettingsCard = () => {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      NOTIFICATION_SETTINGS.map((setting) => [setting.label, true])
    )
  );

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="size-4 text-primary" aria-hidden />
          Notification settings
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        <p className="pb-2 text-xs text-muted-foreground">
          You currently receive
        </p>
        {NOTIFICATION_SETTINGS.map((setting) => (
          <div
            key={setting.label}
            className="flex items-center justify-between gap-3 py-2.5 text-sm last:pb-0"
          >
            <span className="flex items-center gap-2">
              <Switch
                size="sm"
                aria-label={setting.label}
                checked={enabled[setting.label]}
                onCheckedChange={(checked) =>
                  setEnabled((current) => ({
                    ...current,
                    [setting.label]: checked,
                  }))
                }
              />
              {setting.label}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {setting.channels}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

/**
 * "Avg. response time" has no equivalent in the notification data at all —
 * there is no second timestamp anywhere (only `created_at` and a `read`
 * boolean) to measure a response against, so it stays fixed copy, same as
 * the settings list above.
 */
const AVG_RESPONSE_TIME_THIS_WEEK = "3.4 h";

/**
 * The prototype's "This week" panel (`app-source.txt` 1866) — every number
 * but one is real, counted from the same rows `NotificationsList` renders
 * rather than a separate stats endpoint: "Notifications received" is the
 * server's total, "Currently unread" and "Actioned" (`action_completed`
 * notifications) are counted client-side off the full page fetched here.
 */
const ThisWeekCard = () => {
  const { data } = useNotificationsList({
    page: 1,
    pageSize: MAX_PAGE_SIZE,
    unreadOnly: false,
  });
  const items = data?.items ?? [];

  const rows = [
    ["Notifications received", String(data?.total ?? 0)],
    ["Currently unread", String(items.filter((item) => !item.read).length)],
    [
      "Actioned",
      String(items.filter((item) => item.kind === "action_completed").length),
    ],
    ["Avg. response time", AVG_RESPONSE_TIME_THIS_WEEK],
  ] as const;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-primary" aria-hidden />
          This week
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0"
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold text-primary">{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export const NotificationsList = () => {
  const [filters, setFilters] = useState<NotificationFilters>(INITIAL_FILTERS);

  /**
   * One query — `page: 1, pageSize: MAX_PAGE_SIZE, unreadOnly: false` — the
   * same shape `MarkAllReadButton` and `ThisWeekCard` ask for, so React Query
   * serves this screen's three consumers from a single network request
   * instead of three. The `All`/`Unread` tab and the on-screen page are both
   * answered from this one fetched set rather than round-tripping the server
   * again: nobody's notification count gets near `MAX_PAGE_SIZE`, so "the
   * whole list" and "page 1 of 100" are the same fetch. A real backend with
   * unbounded history would need this to go back to server-side paging.
   */
  const { data, isLoading, isFetching, isError } = useNotificationsList({
    page: 1,
    pageSize: MAX_PAGE_SIZE,
    unreadOnly: false,
  });
  const now = useNow();

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

  const allItems = data?.items ?? [];
  const filteredItems = filters.unreadOnly
    ? allItems.filter((item) => !item.read)
    : allItems;
  const total = filteredItems.length;
  const items = filteredItems.slice(
    (filters.page - 1) * filters.pageSize,
    filters.page * filters.pageSize
  );

  return (
    <div className="flex flex-col gap-4">
      {/*
        The prototype's All / Unread tabs (1852): an underline strip, not filled
        buttons — a full-width line under the row, the active tab's own 2px
        line on top of it. A real toggle group rather than `Tabs`, because
        switching does not reveal a second panel — it re-filters the one page
        already fetched above, with no request of its own.
      */}
      <div
        role="group"
        aria-label="Filter notifications"
        className="flex flex-wrap gap-4 border-b border-border"
      >
        {(
          [
            { label: "All", unreadOnly: false },
            { label: "Unread", unreadOnly: true },
          ] as const
        ).map((tab) => (
          <button
            key={tab.label}
            type="button"
            aria-pressed={filters.unreadOnly === tab.unreadOnly}
            onClick={() => setFilter("unreadOnly", tab.unreadOnly)}
            className={cn(
              "-mb-px border-b-2 px-1 pb-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              filters.unreadOnly === tab.unreadOnly
                ? "border-primary font-semibold text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/*
        The prototype's two-column body (1855): the list at 1fr, a 360px
        settings/stats column beside it. `22rem` mirrors that width using the
        same breakpoint convention as `ActionDetail`'s overview/comments split.
        Columns stretch to equal height (grid's default) so a short page of
        results still fills the row rather than leaving the list card shorter
        than the sidebar.
      */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="size-4 text-primary" aria-hidden />
                Your notifications
              </CardTitle>
            </CardHeader>
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
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  Notifications could not be loaded. Reload to try again.
                </p>
              ) : items.length === 0 ? (
                <EmptyState
                  icon={BellOff}
                  title={
                    filters.unreadOnly
                      ? "No notifications"
                      : "No notifications yet"
                  }
                  description={
                    filters.unreadOnly
                      ? "You are all caught up."
                      : "Assignments, overdue actions and new summaries appear here."
                  }
                />
              ) : (
                /*
                  Capped and internally scrollable — same `max-h-[60vh]` the
                  header tray already uses (`NotificationsTray`). Without a
                  cap, a full page of 20 or 50 rows (`DataTablePagination`'s
                  own page-size choices) grew the card past the sidebar it is
                  grid-stretched to match, and its rounded/bordered box no
                  longer contained its own rows.
                */
                <ul className="flex max-h-[60vh] flex-col divide-y divide-border overflow-y-auto">
                  {items.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      at={now}
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Directly under the list it paginates, not the full-width row below the sidebar. */}
          <DataTablePagination
            page={filters.page}
            pageSize={filters.pageSize}
            total={total}
            disabled={isFetching}
            onPageChange={(page) => setFilter("page", page)}
            onPageSizeChange={(pageSize) => setFilter("pageSize", pageSize)}
          />
        </div>

        <div className="flex flex-col gap-6">
          <NotificationSettingsCard />
          <ThisWeekCard />
        </div>
      </div>
    </div>
  );
};
