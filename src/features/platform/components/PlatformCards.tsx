"use client";

/*
  Icons match the prototype's own `tIcon` / `widgetIcon` values (app-source.txt
  1163), Material Icons names mapped to their nearest lucide equivalent:

  | Prototype | Card | lucide |
  | --- | --- | --- |
  | `insights` (759) | Logbook Activity — This Shift | `Insights` |
  | `people` | Active Users | `Users` |
  | `monitor_heart` | System Health | `MonitorHeart` |
  | `verified` | Logbook Compliance | `Verified` |
*/
import {
  Insights,
  MonitorHeart,
  People,
  Verified,
  type MaterialIconProps,
} from "@/components/icons/material";
import type { ComponentType } from "react";
import type { ReactNode } from "react";

import { Notice } from "@/components/Notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricTile } from "@/features/monitoring/components/MetricTile";
import { HEALTH_LABEL, type HealthStatus } from "@/features/monitoring/schemas";
import { usePlatformOverview } from "@/features/platform/api/queries";
import {
  ROLE_PLURAL_LABEL,
  adoptionPercent,
} from "@/features/platform/schemas";
import { formatPlantTime } from "@/lib/datetime";
import { percentWidthClass } from "@/lib/percent-width";
import { cn } from "@/lib/utils";

/**
 * The Super User dashboard's cards — the prototype's `dashboard()` for
 * `role === 'superuser'` (app-source.txt 1133–1165), which is the only role
 * that screen is reachable by (`admin` is dispatched to `adminDashboard`, and
 * every operational role to `specDashboard`).
 *
 * ## ⚠️ Read this before treating anything here as fact
 *
 * **No BRD requirement covers these four cards.** §6.5 defines the Super User's
 * job as dashboard configuration and permission management and says nothing
 * about a home screen, so they come from the prototype alone.
 * `features/platform/schemas.ts` says which figures are inventions and why.
 * Nothing repeats it on screen — see the note below `PlatformCard`.
 *
 * ## Three of the four are widgets, one is not
 *
 * `LogbookActivityCard` is rendered by the dashboard directly, above the grid
 * and outside the personalisation system — the prototype puts `logKpiCard()`
 * there, before the `widgets.map` and with no drag handle, hide control or
 * resize (1146). It is the answer to "what is happening on the platform right
 * now", which is the frame for everything below it rather than one card among
 * them, the same argument `ShiftContextBanner` makes for itself.
 *
 * The other three are ordinary library widgets, so a Super User can hide,
 * resize and reorder them (**FR-DASH-04**) and the assignment stays data rather
 * than code.
 */

/** `ui/card`'s composition — the same shape `PlantOpsCards` and `SystemMonitor` use. */
const PlatformCard = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<MaterialIconProps>;
  children: ReactNode;
}) => (
  <Card className="min-w-0">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon className="size-5 text-primary" aria-hidden />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

/*
  ⚠️ **There is no "Sample data" banner above these cards, and that is a
  standing owner decision rather than an oversight.**

  `PlantOpsNotice` warned exactly this way above the six plant-operations cards
  and was deleted at the owner's request so the dashboard matches the prototype,
  which carries no such warning. Adding one back here for the Super User's four
  cards would reopen a decision that was already made against it, on weaker
  facts — so it is not added, and the reasoning is recorded instead.

  **None of the underlying facts changed.** Every figure below is invented
  (`mocks/data/platform.ts`) and no BRD requirement covers any of these cards.
  `isPlatformWidget` in `widgetRegistry` records which widgets those are, so
  putting a notice back is a render decision rather than a rebuild.

  ⚠️ The compliance percentage is the one worth raising again before sign-off:
  "96% of entries signed on time" reads as an audit finding, it is the kind of
  number that gets pasted into a report, and nothing on the screen says it was
  made up.
*/

/** Shared loading/error handling, so four cards do not each reinvent it. */
const usePlatformCard = () => usePlatformOverview();

/**
 * Loading, error and content — with the rule that **an error never removes data
 * already on screen**. See the twin in `PlantOpsCards`: all four cards share one
 * polled query key, so testing `isError` before `children` let one transient
 * background 500 blank the entire set even though TanStack still held the data.
 */
const CardState = ({
  isLoading,
  isError,
  hasData,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  /** Whether a previous load succeeded, so there is something worth keeping. */
  hasData: boolean;
  children: ReactNode;
}) => {
  const notice = isError ? (
    <Notice live>Platform overview could not be loaded.</Notice>
  ) : null;

  if (isError && !hasData) return notice;
  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <>
      {notice}
      {children}
    </>
  );
};

/**
 * One `label … value` row with a leading dot — the prototype's `statRow`, which
 * both the Active Users and System Health cards are built from.
 *
 * A `<ul>` rather than a stack of `<div>`s: these are lists of the same kind of
 * thing, and a screen reader announcing "list, 4 items" is the difference
 * between four related readings and four unrelated ones. The dot is
 * `aria-hidden` — it repeats the status word beside it, and colour alone never
 * carries the meaning (WCAG 1.4.1).
 */
const StatRow = ({
  label,
  value,
  dotClassName,
  valueClassName,
  divided,
}: {
  label: string;
  value: string;
  dotClassName: string;
  valueClassName: string;
  /** A rule above this row. Driven by position, as `SystemMonitor`'s `Row` does. */
  divided?: boolean;
}) => (
  <li
    className={cn(
      "flex items-center justify-between gap-3 py-2.5",
      divided && "border-t border-border-subtle"
    )}
  >
    <span className="flex min-w-0 items-center gap-2.5 text-sm">
      <span
        className={cn("size-2 shrink-0 rounded-full", dotClassName)}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </span>
    <span className={cn("shrink-0 text-sm font-semibold", valueClassName)}>
      {value}
    </span>
  </li>
);

/* -------------------------------------------------------------------------- */

/**
 * "Logbook Activity — This Shift" — `logKpiCard`'s `superuser` row (759).
 *
 * The Administrator's monitoring board draws the same card from its own row
 * (`SystemMonitor`, `logKpiCard` 452) and the two share their first two tiles.
 * They are not one component: the last two figures differ per role, the two
 * screens read different endpoints for permission reasons the route file
 * records, and folding them together would have coupled a Super User's card to
 * an Administrator-only payload.
 */
export const LogbookActivityCard = () => {
  const { data, isLoading, isError } = usePlatformCard();

  /*
    The prototype hardcodes "of 190 · 75%" beside a 142. Derived here so the two
    halves cannot disagree, and the percentage clause is dropped rather than
    printed as "NaN%" when there is no denominator.
  */
  const adoption = data
    ? adoptionPercent(data.activeUsers24h, data.provisionedUsers)
    : null;
  const activeUsersCaption = data
    ? `of ${data.provisionedUsers.toLocaleString()}${
        adoption === null ? "" : ` · ${adoption}%`
      }`
    : "";

  return (
    <PlatformCard title="Logbook activity — this shift" icon={Insights}>
      <CardState
        isLoading={isLoading}
        isError={isError}
        hasData={data !== undefined}
      >
        {data ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              label="Audit events today"
              value={data.auditEventsToday.toLocaleString()}
              caption="platform-wide"
              tone="brand"
            />
            <MetricTile
              label="Active users (24h)"
              value={data.activeUsers24h.toLocaleString()}
              caption={activeUsersCaption}
              tone="success"
            />
            <MetricTile
              label="Custom dashboards"
              value={data.customDashboards.toLocaleString()}
              caption={`built by ${data.customDashboardRoles} roles`}
            />
            <MetricTile
              label="Role adoption"
              value={`${data.activeRoles} / ${data.totalRoles}`}
              caption="roles active this week"
              tone="success"
            />
          </div>
        ) : null}
      </CardState>
    </PlatformCard>
  );
};

/** "Active Users" — `widgetBody` case `users` (331). */
export const ActiveUsersCard = () => {
  const { data, isLoading, isError } = usePlatformCard();

  return (
    <PlatformCard title="Active users" icon={People}>
      <CardState
        isLoading={isLoading}
        isError={isError}
        hasData={data !== undefined}
      >
        <ul>
          {(data?.usersByRole ?? []).map((row, index) => (
            <StatRow
              key={row.role}
              label={ROLE_PLURAL_LABEL[row.role]}
              value={row.count.toLocaleString()}
              dotClassName="bg-primary"
              valueClassName="text-primary tabular-nums"
              divided={index > 0}
            />
          ))}
        </ul>
      </CardState>
    </PlatformCard>
  );
};

/** Dot and value colour per service state — the prototype's `MON_OK` (346). */
const STATUS_DOT: Record<HealthStatus, string> = {
  healthy: "bg-success",
  warning: "bg-warning",
  critical: "bg-destructive",
};

const STATUS_TEXT: Record<HealthStatus, string> = {
  healthy: "text-success",
  warning: "text-warning",
  critical: "text-destructive",
};

/**
 * "System Health" — `widgetBody` case `health` (332).
 *
 * The fourth row is a *time*, not a status, which is why `lastBackupAt` is not
 * folded into `services` with a made-up "healthy": a backup that ran is not a
 * service that is up, and colouring it green would assert something the payload
 * does not say. It renders muted, as the prototype draws it.
 */
export const SystemHealthCard = () => {
  const { data, isLoading, isError } = usePlatformCard();

  return (
    <PlatformCard title="System health" icon={MonitorHeart}>
      <CardState
        isLoading={isLoading}
        isError={isError}
        hasData={data !== undefined}
      >
        <ul>
          {(data?.services ?? []).map((service, index) => (
            <StatRow
              key={service.name}
              label={service.name}
              value={HEALTH_LABEL[service.status]}
              dotClassName={STATUS_DOT[service.status]}
              valueClassName={STATUS_TEXT[service.status]}
              divided={index > 0}
            />
          ))}
          {data ? (
            <StatRow
              label="Last backup"
              value={formatPlantTime(data.lastBackupAt)}
              dotClassName="bg-muted-foreground"
              valueClassName="text-muted-foreground tabular-nums"
              divided={data.services.length > 0}
            />
          ) : null}
        </ul>
      </CardState>
    </PlatformCard>
  );
};

/**
 * "Logbook Compliance" — `widgetBody` case `compliance` (324).
 *
 * The bar is a `role="progressbar"`, not two nested `<div>`s, for the reason
 * `UsageBar` gives: a percentage drawn as a width is invisible to assistive
 * technology. It shares that component's width table (`lib/percent-width.ts`)
 * and deliberately not its fill colour — `UsageBar` reads high as bad, and 96%
 * compliance would have come out red.
 */
export const LogbookComplianceCard = () => {
  const { data, isLoading, isError } = usePlatformCard();
  const percent = data?.compliancePercent ?? 0;
  const rounded = Math.round(percent);

  return (
    <PlatformCard title="Logbook compliance" icon={Verified}>
      <CardState
        isLoading={isLoading}
        isError={isError}
        hasData={data !== undefined}
      >
        {data ? (
          <div className="flex flex-col items-center gap-1 py-2">
            <p className="text-4xl leading-none font-bold text-primary tabular-nums">
              {rounded}%
            </p>
            <p className="text-sm text-muted-foreground">
              Entries signed on time
            </p>
            <div
              className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Entries signed on time"
              aria-valuenow={rounded}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn(
                  "h-full rounded-full bg-primary transition-[width] duration-500",
                  percentWidthClass(percent)
                )}
              />
            </div>
          </div>
        ) : null}
      </CardState>
    </PlatformCard>
  );
};
