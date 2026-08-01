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

// A notification list, not a table — DataTablePagination is reused for paging only.

const INITIAL_FILTERS: NotificationFilters = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  unreadOnly: false,
};

// Loops POST /notifications/:id/read per unread id — no bulk endpoint exists. Same query params as ThisWeekCard so React Query dedupes the fetch.
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
    // Per-id failures already toast via useMarkNotificationRead; this is only for the act as a whole succeeding.
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

// Static settings list — fixed copy; the real per-user matrix is Administrator-only and has no self-service form yet.
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

// No second timestamp exists to compute a real response time from, so this stays fixed copy.
const AVG_RESPONSE_TIME_THIS_WEEK = "3.4 h";

// "This week" stats — all but Avg. response time are computed from the fetched notifications.
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

  // Same query shape as MarkAllReadButton/ThisWeekCard so React Query dedupes to one request; tab and paging below are filtered/sliced client-side from it.
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
      // Switching tab while on page 3 would otherwise land on an empty page.
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
      {/* All/Unread tabs re-filter the already-fetched page client-side — no request per switch. */}
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

      {/* Two-column layout — columns stretch equal height so a short page still fills the row. */}
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
                // Checked before the empty state — "No notifications yet" on a failed request would misstate the inbox.
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
                // Capped and scrollable (max-h-[60vh], matching NotificationsTray) so a long page doesn't grow the card past the sidebar.
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
