"use client";

import type { SVGProps } from "react";
import { useState } from "react";
import {
  Activity,
  Bell,
  BellOff,
  CheckCheck,
  TriangleAlert,
} from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/constants/api";
import { useMarkAllNotificationsRead } from "@/features/notifications/api/mutations";
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
 * "Notification settings" card, and a stat panel the prototype calls "This
 * week" (`NotificationsOverviewCard` here — see its own doc for why the name
 * changed). All three are ported below (`MarkAllReadButton`,
 * `NotificationSettingsCard`, `NotificationsOverviewCard`) for visual parity;
 * see each for what is real data and what is static content carried over
 * from the prototype as-is.
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
 * The prototype's header "Mark all read" (`app-source.txt` 1849) — one
 * `POST /notifications/read-all` rather than looping `POST /:id/read` once
 * per unread row. The loop this replaced turned a single click into N
 * requests, N cache invalidations, and let the action half-succeed with no
 * atomic outcome to report (NFR-12); the bulk endpoint does the whole thing
 * server-side in one write. Rendered from `NotificationsPage` via
 * `PageHeader`'s `actions` slot, matching the prototype's placement in the
 * page header row.
 *
 * **One row, purely to read `total` off the envelope** — the same shape
 * `useNotificationTray` already uses for its badge, and for the same reason:
 * "is anything unread" sampled from a fetched page is a sample, not an
 * answer. A user with more unread notifications than fit in one fetched page
 * would otherwise see this button go disabled while their inbox still had
 * unread rows sitting past the fetched window.
 */
export const MarkAllReadButton = () => {
  const { data, isFetching } = useNotificationsList({
    page: 1,
    pageSize: 1,
    unreadOnly: true,
  });
  const markAllRead = useMarkAllNotificationsRead();

  const hasUnread = (data?.total ?? 0) > 0;

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => markAllRead.mutate()}
      disabled={isFetching || markAllRead.isPending || !hasUnread}
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
 * (Administrator only) — an Administrator's setting, not this signed-in user's
 * to flip. An earlier version rendered an interactive `Switch` here that
 * toggled local state and persisted nothing, which let an end user "turn off"
 * a permission only the Administrator can actually change — a control that
 * lied about what a click did. The prototype's own row (1863) is a static
 * dot, not a toggle, so this matches that until Phase 3 gives a signed-in
 * user their own read form for this matrix.
 */
/**
 * The prototype's `material-icons` `settings` glyph — a solid gear, not an
 * outline. Lucide has no filled variant, and its stroked `Settings` read as a
 * visibly different icon next to the prototype's, so this is the actual
 * glyph path (Google's `material-design-icons`, Apache-2.0), traced once
 * here rather than pulling in the whole icon font for one icon.
 */
const SettingsGlyph = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
  </svg>
);

const NOTIFICATION_SETTINGS: readonly { label: string; channels: string }[] = [
  { label: "Action assigned to me", channels: "In-app, Email" },
  { label: "Action overdue", channels: "In-app" },
  { label: "Summary report ready", channels: "In-app" },
  { label: "Report ready", channels: "In-app" },
  { label: "AI suggestions", channels: "In-app, Email" },
];

const NotificationSettingsCard = () => {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          {/*
            The prototype's raw `#0E8C81`, not `--primary` (`#0D857B` —
            `globals.css`'s ratified AA-adjustment for *text*). WCAG's non-text
            contrast floor is 3:1, not 4.5:1, and an icon clears that at either
            shade — so matching the prototype's exact teal here doesn't
            reopen the accessibility gap that adjustment exists for.
          */}
          <SettingsGlyph className="size-3.5 text-[#0E8C81]" />
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
              {/*
                A static dot, not a `Switch` — the prototype's own row (1863)
                isn't a toggle either. This is an Administrator-owned setting
                (`/admin/notification-permissions`, FR-NOT-01); a switch this
                user could flip would persist nothing and lie about what the
                click did.
              */}
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full bg-success"
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
 * The prototype's "This week" panel (`app-source.txt` 1866), retitled.
 *
 * **"Avg. response time" is gone.** There is no second timestamp anywhere in
 * a notification (only `created_at` and a `read` boolean) to measure a
 * response against — nothing here can produce that number, fixed or
 * otherwise, so it was fabricated copy rather than fixed copy.
 *
 * **Not "This week" either.** None of the three remaining rows window by
 * date — "Notifications received" is the server's all-time total for this
 * user, and "Currently unread"/"Actioned" are counted off the same
 * unwindowed page. Labelling that "This week" was a false claim about scope,
 * not just a missing feature; the API has no date-range filter to build a
 * real one against yet (`GET /notifications` takes `unread`, not `from`/`to`
 * — unlike `/audit`, which does). Retitled to say what these numbers
 * actually are instead.
 */
const NotificationsOverviewCard = () => {
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
  ] as const;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4 text-primary" aria-hidden />
          Notifications overview
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
   * Server-side paging and filtering — `page`, `pageSize` and `unreadOnly`
   * all go on the wire, same as every other list in the app. An earlier
   * version fetched one `pageSize: MAX_PAGE_SIZE` page up front and paged
   * and filtered it client-side, trading a real page for a same-shape query
   * `MarkAllReadButton`/`NotificationsOverviewCard` could share. That broke
   * past `MAX_PAGE_SIZE` notifications: the pagination footer showed the
   * count of whatever fit in that one fetched page while
   * `NotificationsOverviewCard`'s own `data.total` showed the server's real
   * count — two different totals on one screen. `data.total` already answers
   * "how many, for this filter" per request; there is nothing to compute
   * client-side.
   */
  const { data, isLoading, isFetching, isError } =
    useNotificationsList(filters);
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

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

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
          <NotificationsOverviewCard />
        </div>
      </div>
    </div>
  );
};
