"use client";

/*
  **The prototype's own glyphs**, read out of the font it embeds — see
  `components/icons/material.tsx`. Each is the literal `tIcon` argument:
  `insights` (759), `group` (413), `monitor_heart` (432), `smart_toy` (440),
  `memory` (448), and `refresh` on the header button (411).
*/
import {
  Group,
  Insights,
  Memory,
  MonitorHeart,
  Refresh,
  SmartToy,
  type MaterialIconProps,
} from "@/components/icons/material";
import type { ComponentType } from "react";
import { useState } from "react";
import type { ReactNode } from "react";

import { LineChart } from "@/components/charts/LineChart";
import { Gauge } from "@/components/charts/Gauge";
import { Sparkline } from "@/components/charts/Sparkline";
import { Notice } from "@/components/Notice";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ShiftContextBanner } from "@/features/home/components/ShiftContextBanner";
import { useSystemMonitoring } from "@/features/monitoring/api/queries";
import { HealthChip } from "@/features/monitoring/components/HealthChip";
import { MetricTile } from "@/features/monitoring/components/MetricTile";
import { UsageBar } from "@/features/monitoring/components/UsageBar";
import {
  accuracyTone,
  type SystemMonitoring,
} from "@/features/monitoring/schemas";
import { formatPlantTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

/**
 * The Administrator's home — §6.4's *"Sign in → System Administration
 * dashboard"*, **FR-OBS-04** (live usage with history/trend) and **FR-OBS-02**
 * (system and model performance).
 *
 * The prototype's `adminDashboard()` (app-source.txt 396–453), with its four
 * cards intact: user monitoring, application health, AI model accuracy, system
 * performance.
 *
 * ## The figures are illustrative and the screen says so
 *
 * No telemetry backend exists — §7.11 specifies this screen, not its payload —
 * so every number here comes from a fixed seed. The banner at the top states
 * that in the UI rather than only in a comment, because a monitoring board is
 * the one screen where a viewer's default assumption is "these are
 * measurements", and a plausible invented CPU figure is worse than an obviously
 * absent one.
 *
 * That is also why there is no random walk. The prototype re-randomises every
 * metric on a 4-second timer (`tickMon`, 360); numbers that move are read as
 * observations, and somebody would eventually escalate a spike that was
 * `Math.random`. Liveness here is the one-minute refetch in
 * `useSystemMonitoring` — the mechanism that will still be correct when the
 * figures become real.
 */

/**
 * `ui/card`'s composition, not a bespoke `<section>`. An earlier draft of this
 * file declared its own card and reproduced the ring, radius and spacing by
 * hand — which is how two card styles end up on one screen the first time the
 * design system's spacing token changes.
 */
const MonitorCard = ({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: ComponentType<MaterialIconProps>;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <Card className="min-w-0">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon className="size-5 text-primary" aria-hidden />
        {title}
      </CardTitle>
      {action ? <CardAction>{action}</CardAction> : null}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-5 mb-2 text-2xs font-bold tracking-wider text-muted-foreground uppercase">
    {children}
  </p>
);

const Row = ({
  label,
  children,
  divided,
}: {
  label: string;
  children: React.ReactNode;
  divided?: boolean;
}) => (
  <div
    className={`flex items-center justify-between gap-3 py-2.5 ${divided ? "border-t border-border-subtle" : ""}`}
  >
    <span className="text-sm">{label}</span>
    {children}
  </div>
);

/**
 * The prototype's layout, read off `adminDashboard`'s grid (452): logbook
 * activity and user monitoring span both columns, application health and AI
 * accuracy sit side by side, and system performance spans again.
 */
const Body = ({ data }: { data: SystemMonitoring }) => (
  <div className="flex flex-col gap-6">
    {/* `logKpiCard` (452) — the prototype puts this above everything else. */}
    <MonitorCard title="Logbook activity — this shift" icon={Insights}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Audit events today"
          value={data.auditEventsToday.toLocaleString()}
          caption="edits across all logs"
          tone="brand"
        />
        <MetricTile
          label="Active users (24h)"
          value={String(data.activeUsers24h)}
          caption={`of ${data.provisionedUsers} provisioned`}
          tone="success"
        />
        <MetricTile
          label="Deleted entries"
          value={String(data.deletedEntries)}
          caption="flagged for review"
          tone="critical"
        />
        <MetricTile
          label="Data completeness"
          value={`${Math.round(data.dataCompletenessPercent)}%`}
          caption="key fields populated"
        />
      </div>
    </MonitorCard>

    <MonitorCard
      title="User monitoring metrics"
      icon={Group}
      action={<HealthChip status={data.overallStatus} />}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Total users"
          value={String(data.totalUsers)}
          caption="across all roles"
        />
        <MetricTile
          label="Active users"
          value={String(data.activeUsers)}
          caption="last 24 hours"
          tone="brand"
        />
        <MetricTile
          label="Online users"
          value={String(data.onlineUsers)}
          caption="signed in now"
          tone="success"
        />
        {/*
          The prototype's fourth tile is New Registrations (418) and this
          matches it. **FR-OBS-04 names "peak concurrent users" instead**, and
          that figure is still on the contract and in the accessible data — it
          simply has no tile, because the owner asked this screen to match what
          was demonstrated. Worth resolving before sign-off: the requirement
          asks for a number the screen does not show.
        */}
        <MetricTile
          label="New registrations"
          value={`+${data.newRegistrations}`}
          caption="today"
        />
      </div>

      <SectionLabel>User activity trend · online users / hour</SectionLabel>
      <LineChart
        label="Online users per hour over the last twelve hours"
        categoryHeader="Hour"
        filled
        xLabels={data.activityTrend.map(
          (_, index) => `−${data.activityTrend.length - index}h`
        )}
        series={[
          { name: "Online users", tone: "chart-1", points: data.activityTrend },
        ]}
      />
    </MonitorCard>

    <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
      <MonitorCard title="Application health" icon={MonitorHeart}>
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <span className="text-sm font-semibold">Overall system status</span>
          <HealthChip status={data.overallStatus} />
        </div>

        <SectionLabel>Service health</SectionLabel>
        {data.services.map((service, index) => (
          <Row key={service.name} label={service.name} divided={index > 0}>
            <HealthChip status={service.status} />
          </Row>
        ))}

        <SectionLabel>Endpoints</SectionLabel>
        <Row label="API status">
          <HealthChip status={data.apiStatus} />
        </Row>
        <Row label="Database status" divided>
          <HealthChip status={data.databaseStatus} />
        </Row>

        <div className="mt-3 flex items-end justify-between gap-4 border-t border-border-subtle pt-4">
          <div>
            <p className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
              Error rate
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {data.errorRatePercent.toFixed(1)}%
            </p>
            <p className="mt-0.5 text-2xs text-muted-foreground">
              failed / total · 5 min
            </p>
          </div>
          <div className="w-32 shrink-0">
            <Sparkline
              label="Error rate over the last eight intervals"
              values={data.errorRateHistory}
              tone="chart-3"
            />
          </div>
        </div>
      </MonitorCard>

      <MonitorCard title="AI model performance" icon={SmartToy}>
        {/*
        A donut of accuracy against its own remainder. The prototype draws a
        single-arc gauge; `PieChart` expresses the same reading as two slices,
        which is what gives the accessible table a denominator to report.
      */}
        <Gauge
          label="AI model accuracy"
          categoryHeader="Measure"
          percent={data.aiAccuracyPercent}
          caption="model accuracy"
          tone={accuracyTone(data.aiAccuracyPercent)}
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <MetricTile
            label="Avg response"
            value={`${Math.round(data.aiResponseMs)} ms`}
            caption="rolling 5 min"
          />
          <MetricTile
            label="Requests today"
            value={data.aiRequestsToday.toLocaleString()}
            caption="all endpoints"
          />
          <MetricTile
            label="Success rate"
            value={`${data.aiSuccessPercent.toFixed(1)}%`}
            caption="last 1k calls"
            tone="success"
          />
          <MetricTile
            label="Failed today"
            value={String(data.aiFailedToday)}
            caption="retried or surfaced"
            tone="critical"
          />
        </div>
      </MonitorCard>
    </div>

    {/* Full width again, and two columns inside — the prototype's `cPerf` (442). */}
    <MonitorCard title="System performance" icon={Memory}>
      <div className="grid gap-8 xl:grid-cols-2 xl:items-start">
        <div className="flex flex-col gap-4">
          <UsageBar label="CPU usage" percent={data.cpuPercent} />
          <UsageBar label="Memory usage" percent={data.memoryPercent} />
          <UsageBar label="Disk usage" percent={data.diskPercent} />
          <UsageBar label="Network usage" percent={data.networkPercent} />
        </div>

        <div>
          <SectionLabel>API response time</SectionLabel>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-xl font-bold tabular-nums">
              {Math.round(data.apiResponseMs)} ms
            </p>
            <p className="text-2xs text-muted-foreground">
              p95 across endpoints
            </p>
          </div>
          <LineChart
            label="API response time over the last eight intervals"
            categoryHeader="Interval"
            unit="ms"
            filled
            xLabels={data.apiResponseHistory.map(
              (_, index) => `T−${data.apiResponseHistory.length - index}`
            )}
            series={[
              {
                name: "Response time",
                tone: "chart-2",
                points: data.apiResponseHistory,
              },
            ]}
          />
        </div>
      </div>
    </MonitorCard>
  </div>
);

export const SystemMonitor = () => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { data, isLoading, isError, isFetching, refetch } =
    useSystemMonitoring(autoRefresh);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        /*
          The chip belongs to the heading, not to the controls — the prototype
          puts it immediately after the title (406), where it reads as part of
          the sentence "System monitoring: healthy". At the far right of a
          1440px header it is just another control.
        */
        title={
          <>
            System monitoring
            {data ? <HealthChip status={data.overallStatus} /> : null}
          </>
        }
        description="Real-time platform health across services, models and infrastructure."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {data ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                {/*
                  A dot, not an icon — the prototype's own indicator (409),
                  which pulses green while auto-refresh is on and greys out
                  when it is off. It says "this is live" in less space than a
                  glyph and without competing with the Refresh button beside it.
                */}
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    autoRefresh ? "bg-success" : "bg-muted-foreground"
                  )}
                  aria-hidden
                />
                Updated {formatPlantTime(data.generatedAt)}
              </p>
            ) : null}
            {/*
              The prototype's Auto-refresh switch (410). It earns its place
              despite `DASHBOARD_REFRESH` already pausing in a background tab:
              a foreground control-room screen is exactly where somebody needs
              to stop the numbers moving to read one, and that is the case the
              background-tab pause does not cover.
            */}
            {/*
              A `<span>`, not a `<label>`. Base UI renders the switch as a
              `<span role="switch">`, which is not a labelable element — so the
              wrapper contributed nothing to the control and instead confused
              the accessible-name computation, leaving the switch unfindable by
              its own name. The `aria-label` is what names it, which is the
              pattern `WorkflowCard` already uses.
            */}
            <span className="flex items-center gap-2 text-xs font-medium">
              <span className="text-muted-foreground">Auto-refresh</span>
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                aria-label="Auto-refresh"
              />
            </span>

            {/* The prototype's Refresh button (411). */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <Refresh
                className={isFetching ? "animate-spin" : undefined}
                aria-hidden
              />
              Refresh
            </Button>
          </div>
        }
      />

      {/*
        ⚠️ **Not in the prototype** — `adminDashboard` (406–412) has a header and
        goes straight to the cards, with no context strip.

        Added at the owner's request, and user instruction outranks the prototype
        (`.claude/rules/README` precedence). It is also the more defensible
        screen: every figure below is "as of" a moment, and the Administrator was
        the one role with nothing on the page saying which shift that moment
        falls in. Removing it again is deleting this line.
      */}
      <ShiftContextBanner />

      {/*
        ⚠️ **The on-screen "Illustrative figures" banner was removed at the
        owner's request** so the screen matches the prototype.

        Nothing else changed: every number below still comes from a fixed seed
        (`mocks/data/monitoring.ts`) and no telemetry service exists. The
        caveat now lives only in code, which is the risk worth recording here —
        a monitoring board is the one screen whose default reading is "these
        are measurements", and a screenshot of it carries no warning at all.

        This should be restored, or the screen withheld, before anyone outside
        the project sees it.
      */}

      {isError ? (
        <Notice live>
          Platform telemetry could not be loaded. Reload to try again.
        </Notice>
      ) : null}

      {isLoading ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : null}

      {data ? <Body data={data} /> : null}
    </div>
  );
};
