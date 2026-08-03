"use client";

/*
  **The prototype's own glyphs, not lookalikes.** Each name below is the literal
  `tIcon` / `ic()` argument in `app-source.txt`, and the component is that exact
  outline read out of the font the prototype embeds — see
  `components/icons/material.tsx`.

  | Prototype | Where |
  | --- | --- |
  | `event_busy` (561) | Safety KPI |
  | `show_chart` (691) | Production trend |
  | `build_circle` (715) | Equipment out of service |
  | `gas_meter` (737) | Flare purge medium |
  | `checklist` (721) | OLET |
  | `sailing` (747) | Next ships |
  | `local_fire_department` / `ac_unit` (730, 733) | purge-medium rows |
  | `directions_boat` (743) | next-ships rows |
  | `inbox` (699) | the in-table empty state |

  Three of these had no honest lucide equivalent, which is what prompted the
  switch: `build_circle` has no circled wrench at all, `gas_meter` was standing
  in as a speedometer, and `sailing` as a powered hull. Note also that the
  next-ships *card* and its *rows* use different boats — the prototype's choice,
  not a slip.
*/
import {
  AcUnit,
  BuildCircle,
  Checklist,
  DirectionsBoat,
  EventBusy,
  GasMeter,
  Inbox,
  LocalFireDepartment,
  Sailing,
  ShowChart,
  type MaterialIconProps,
} from "@/components/icons/material";
import type { ComponentType } from "react";
import { useState } from "react";
import type { ReactNode } from "react";

import { Notice } from "@/components/Notice";
import {
  ChartKindToggle,
  type ChartKind,
} from "@/components/charts/ChartKindToggle";
import { LineChart } from "@/components/charts/LineChart";
import { PieChart } from "@/components/charts/PieChart";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toneAt } from "@/components/charts/tones";
import { usePlantOperations } from "@/features/plant-ops/api/queries";
import {
  PRODUCTION_TONE,
  RAG_BUCKETS,
  RAG_LABEL,
  RAG_TONE,
} from "@/features/plant-ops/schemas";
import type { PlantOperations } from "@/features/plant-ops/schemas";
import { cn } from "@/lib/utils";

/**
 * The prototype's six plant-operations cards (`specKpiSection`, app-source.txt
 * 751), each as a dashboard widget.
 *
 * ## ⚠️ Read this before treating anything on these cards as fact
 *
 * **No BRD requirement covers any of these six screens.** They were delivered
 * in the prototype, never entered BRD v1.3, and are built here at the owner's
 * explicit request for demonstration. Every figure is invented —
 * `mocks/data/plantOps.ts` says exactly how invented. A `PlantOpsNotice` banner
 * used to repeat it on screen; it was removed at the owner's request (see the
 * note above `usePlantOpsCard` below), so a screenshot of these cards now
 * carries no caveat at all.
 *
 * ## Why they are widgets rather than a `specDashboard()` screen
 *
 * The prototype dispatches Operator, Supervisor and Management **away** from
 * the widget grid and into these six cards instead (`dashboard()` 1136), so
 * porting it literally would have deleted FR-HOME-01's current-shift
 * highlights from every operational role's dashboard. Precedence is BRD →
 * prototype, and FR-HOME-01 is a signed requirement while these cards are not,
 * so the requirement's content stays and the prototype's joins it.
 *
 * Making them assignable widgets also puts the decision where §7.12 says it
 * belongs: a Super User can unassign all six without a deploy, and any user can
 * hide them (FR-DASH-04). Neither would be possible if they were a hardcoded
 * screen.
 */

/**
 * The prototype's `dataTable` header treatment (695–697): a tinted band, small
 * uppercase muted labels, and a teal semibold first column.
 *
 * Applied per card rather than pushed into `ui/table`, because that primitive
 * is also the users directory's table and the two are meant to look different —
 * a dense reference table inside a dashboard card versus a full-page data grid
 * with sorting and row actions.
 *
 * `tracking-wider` (0.05em) rather than the prototype's exact `.04em`:
 * `.claude/rules/01` takes typography from the theme scale instead of arbitrary
 * values, and the two are indistinguishable at 11px.
 */
const DATA_TABLE_HEAD =
  "[&_th]:h-9 [&_th]:bg-muted [&_th]:px-3 [&_th]:text-2xs [&_th]:font-semibold [&_th]:tracking-wider [&_th]:text-muted-foreground [&_th]:uppercase";

/** Teal, semibold first column — `dataTable`'s `ci===0` branch (698). */
const DATA_TABLE_BODY =
  "[&_td]:px-3 [&_td:first-child]:font-semibold [&_td:first-child]:text-primary";

/** `ui/card`'s composition — the same shape `SystemMonitor` uses. */
const OpsCard = ({
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
  ⚠️ **`PlantOpsNotice` was deleted at the owner's request, on every role.**

  It rendered a "Sample data" banner above these six cards — that they come from
  the design prototype, are connected to no system, and must not be used
  operationally. The screen now matches the prototype, which carries no such
  warning.

  **None of the underlying facts changed.** Equipment tags, production rates and
  vessel schedules below are invented (`mocks/data/plantOps.ts`) and no BRD
  requirement covers any of these screens. `isIllustrativeWidget` in
  `widgetRegistry` still records which widgets those are, so putting a notice
  back is a render decision rather than a rebuild.
*/

/** Shared loading/error handling, so six widgets do not each reinvent it. */
const usePlantOpsCard = () => {
  const { data, isLoading, isError } = usePlantOperations();
  return { data, isLoading, isError };
};

/**
 * Loading, error and content for a card — with the rule that **an error never
 * removes data that is already on screen**.
 *
 * All six cards read one query key, and it carries a 60-second
 * `refetchInterval`. This used to test `isError` first and return the notice
 * instead of `children`, so a single transient 500 on a background poll blanked
 * every one of the six at once — even though TanStack keeps `data` intact
 * through a background failure (it flags the existing data invalidated rather
 * than dropping it). An operator mid-handover lost the whole board to a blip.
 *
 * `SystemMonitor` already had this right: notice *above* the body, not instead
 * of it. `hasData` is what lets the two agree.
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
    <Notice live>Plant operations data could not be loaded.</Notice>
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

/* -------------------------------------------------------------------------- */

/**
 * `dueDateBars` (556) — the prototype titles this card **"Safety KPI"**, and so
 * does this one. It is a RAG breakdown of open safety items by category, and
 * renaming it would have quietly made two artefacts disagree about what a
 * client had signed off on.
 *
 * The bar/pie toggle is the prototype's (`chartSwitch` 518, `kinds` 557), built
 * on the `ChartKindToggle` this repo already had. **The two forms answer
 * different questions on purpose**: the bar breaks the work down by category,
 * and the pie collapses that away to show the due-date profile — how much of
 * the total is overdue. That is the prototype's own aggregation (559), and
 * getting it backwards is easy, because slicing by category totals the same 70.
 */
export const DueDateRagCard = () => {
  const { data, isLoading, isError } = usePlantOpsCard();
  const [kind, setKind] = useState<ChartKind>("bar");

  /*
    Sliced by RAG bucket, summing *across* categories — the prototype's own
    aggregation (`dueDateBars` 559). An earlier version of this card sliced by
    category instead, which totals the same 70 and looks equally plausible while
    answering a different question. The bar chart already breaks the work down
    by category; the pie exists to answer "how much of it is overdue?", and a
    per-category pie cannot.
  */
  const byBucket = RAG_BUCKETS.map((bucket, bucketIndex) => ({
    label: RAG_LABEL[bucket],
    value: (data?.dueCategories ?? []).reduce(
      (sum, category) => sum + (category.counts[bucketIndex] ?? 0),
      0
    ),
    tone: RAG_TONE[bucket],
  }));

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EventBusy className="size-5 text-primary" aria-hidden />
          Safety KPI
        </CardTitle>
        <CardAction>
          <ChartKindToggle
            label="Chart type for safety KPI"
            value={kind}
            onChange={setKind}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        <CardState
          isLoading={isLoading}
          isError={isError}
          hasData={data !== undefined}
        >
          {data && kind === "bar" ? (
            <StackedBarChart
              label="Open safety items by category and due date"
              categoryHeader="Category"
              totalNoun="open"
              buckets={RAG_BUCKETS.map((bucket) => ({
                name: RAG_LABEL[bucket],
                tone: RAG_TONE[bucket],
              }))}
              categories={data.dueCategories.map((category) => ({
                label: category.label,
                values: category.counts,
              }))}
            />
          ) : null}

          {data && kind === "pie" ? (
            <PieChart
              label="Open safety items by due date"
              categoryHeader="Due date"
              seriesName="Items"
              // The prototype's own centre caption (559).
              centerLabel="items by due date"
              data={byBucket}
            />
          ) : null}
        </CardState>
      </CardContent>
    </Card>
  );
};

/** `secKpiTrend` (683) — the prototype's five production series over a week. */
export const ProductionTrendCard = () => {
  const { data, isLoading, isError } = usePlantOpsCard();

  return (
    <OpsCard title="Production — 7-Day Trend" icon={ShowChart}>
      <CardState
        isLoading={isLoading}
        isError={isError}
        hasData={data !== undefined}
      >
        {data ? (
          <LineChart
            label="Production measures over the last seven days"
            categoryHeader="Day"
            xLabels={data.productionDays}
            series={data.productionSeries.map((entry, index) => ({
              // The unit rides in the name: five series share one axis, so a
              // reader needs to know which of them is a pressure.
              name: `${entry.name} (${entry.unit})`,
              // By name, so each measure keeps the prototype's own hue; see
              // `PRODUCTION_TONE`. `toneAt` only covers a name it does not know.
              tone: PRODUCTION_TONE[entry.name] ?? toneAt(index),
              points: entry.points,
            }))}
          />
        ) : null}
      </CardState>
    </OpsCard>
  );
};

/** `outOfServiceCard` (705). */
export const OutOfServiceCard = () => {
  const { data, isLoading, isError } = usePlantOpsCard();

  return (
    <OpsCard title="Equipment Out of Service" icon={BuildCircle}>
      <CardState
        isLoading={isLoading}
        isError={isError}
        hasData={data !== undefined}
      >
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className={DATA_TABLE_HEAD}>
              <TableRow>
                <TableHead>Tag</TableHead>
                {/* The prototype's own header wording (708). */}
                <TableHead>Description / reason</TableHead>
                <TableHead className="whitespace-nowrap">
                  Area / train
                </TableHead>
                <TableHead className="whitespace-nowrap">Out since</TableHead>
                <TableHead className="whitespace-nowrap">
                  Expected return
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={DATA_TABLE_BODY}>
              {(data?.outOfService ?? []).map((row) => (
                <TableRow key={row.tag}>
                  <TableCell className="whitespace-nowrap">{row.tag}</TableCell>
                  {/*
                    Full-strength text, not muted: `dataTable` colours every
                    cell but the first `C.tx` (698), and the reason is the
                    column a reader is here for.
                  */}
                  <TableCell className="whitespace-normal">
                    {row.reason}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.area}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.outSince}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {/*
                      "TBC" and "Next S/D" are the prototype's own values and
                      are not dates. Marking them as unknown rather than
                      printing them like a commitment is the honest rendering.
                    */}
                    {row.expectedReturn === "TBC" ||
                    row.expectedReturn === "Next S/D" ? (
                      <span className="text-muted-foreground">
                        {row.expectedReturn}
                      </span>
                    ) : (
                      <span className="font-medium text-warning">
                        {row.expectedReturn}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardState>
    </OpsCard>
  );
};

/** `flarePurgeCard` (725). */
export const FlarePurgeCard = () => {
  const { data, isLoading, isError } = usePlantOpsCard();

  return (
    <OpsCard title="Flare Purge Medium" icon={GasMeter}>
      <CardState
        isLoading={isLoading}
        isError={isError}
        hasData={data !== undefined}
      >
        <ul className="flex flex-col gap-3">
          {(data?.flarePurge ?? []).map((area) => {
            const isFuelGas = area.medium === "fuel_gas";
            const MediumIcon = isFuelGas ? LocalFireDepartment : AcUnit;
            /*
              One pair of classes for the icon tile *and* the pill. In the
              prototype both are painted from the same two values — `#FBEDDC` /
              `#9A6310` for fuel gas, `#E4F1EE` / `tealDk` for nitrogen (730,
              733) — so the pill reads as a label for the icon beside it. A
              `Badge` variant could not do that: `outline` and `secondary` are
              medium-agnostic, which left an amber flame next to a grey pill.
            */
            const mediumTone = isFuelGas
              ? "bg-warning/15 text-warning"
              : "bg-accent text-accent-foreground";

            return (
              <li
                key={area.area}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    mediumTone
                  )}
                  aria-hidden
                >
                  <MediumIcon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{area.area}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-2xs font-bold whitespace-nowrap",
                        mediumTone
                      )}
                    >
                      <MediumIcon className="size-3.5" aria-hidden />
                      {isFuelGas ? "Fuel gas" : "Nitrogen"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Since {area.since}
                    </span>{" "}
                    · {area.reason}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardState>
    </OpsCard>
  );
};

/**
 * The prototype's own headers (721), in its order. Named so the empty row's
 * `colSpan` and the header row cannot drift apart.
 */
const OLET_COLUMNS = [
  "Item",
  "Equipment",
  "Reason",
  "Raised",
  "Due",
  "Reference",
] as const;

/** `oletCard` (719) — seeded empty, "empty state per spec". */
export const OletCard = () => {
  const { data, isLoading, isError } = usePlantOpsCard();
  const items = data?.olet ?? [];

  return (
    <OpsCard title="OLET" icon={Checklist}>
      <CardState
        isLoading={isLoading}
        isError={isError}
        hasData={data !== undefined}
      >
        {/*
          The header row renders whether or not there are items — the prototype
          calls `dataTable(headers, [], { empty: … })` (721), which keeps the
          columns and puts the message inside the body.

          That is the better behaviour and worth stating why: OLET is empty on
          most shifts, so the empty state is the state a reader sees most often.
          Keeping the columns tells them *what would be here* — that this table
          reports items, equipment and due dates — where a bare "nothing to show"
          leaves them guessing what the card is even for. An earlier version
          swapped the whole table for an `EmptyState` and lost that.
        */}
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className={DATA_TABLE_HEAD}>
              <TableRow>
                {OLET_COLUMNS.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            {/*
              The first-column colouring applies only when there are rows: the
              empty message is itself a first cell, and it is not a tag.
            */}
            <TableBody className={items.length > 0 ? DATA_TABLE_BODY : ""}>
              {items.length === 0 ? (
                <TableRow>
                  {/*
                    `colSpan` off the column list rather than a literal 6: a
                    seventh column would otherwise leave the empty message
                    short, misaligned, and nobody would connect the two changes.
                  */}
                  <TableCell colSpan={OLET_COLUMNS.length}>
                    {/*
                      `dataTable`'s own in-table empty (699) — a small inbox
                      glyph over one muted line — rather than the page-level
                      `EmptyState`, whose 56px circled icon and `text-base`
                      heading dominated a card that is empty on most shifts.
                    */}
                    <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center text-xs text-muted-foreground">
                      <Inbox className="size-6" aria-hidden />
                      No OLET items reported this shift
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={`${row.item}-${row.equipment}`}>
                    <TableCell>{row.item}</TableCell>
                    <TableCell>{row.equipment}</TableCell>
                    <TableCell>{row.reason}</TableCell>
                    <TableCell>{row.raised}</TableCell>
                    <TableCell>{row.due}</TableCell>
                    <TableCell>{row.reference}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardState>
    </OpsCard>
  );
};

/** `nextShipCard` (741). */
export const NextShipsCard = () => {
  const { data, isLoading, isError } = usePlantOpsCard();

  return (
    <OpsCard title="Next Ships — Berthing Schedule" icon={Sailing}>
      <CardState
        isLoading={isLoading}
        isError={isError}
        hasData={data !== undefined}
      >
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className={DATA_TABLE_HEAD}>
              <TableRow>
                <TableHead>Vessel</TableHead>
                <TableHead className="whitespace-nowrap">ETA</TableHead>
                {/* Left, like every other `dataTable` column (696). */}
                <TableHead>Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={DATA_TABLE_BODY}>
              {(data?.nextShips ?? []).map((ship) => (
                <TableRow key={ship.vessel}>
                  <TableCell className="whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      {/*
                        `directions_boat` (743) — the row glyph, deliberately
                        not the card's `sailing`.
                      */}
                      <DirectionsBoat className="size-4" aria-hidden />
                      {ship.vessel}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {ship.eta}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {ship.quantity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardState>
    </OpsCard>
  );
};

export type { PlantOperations };
