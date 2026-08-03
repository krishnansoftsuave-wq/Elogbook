import { ClipboardList, ShieldCheck, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { LatestSummarySection } from "@/features/home/components/LatestSummarySection";
import { PendingActionsByStatus } from "@/features/home/components/PendingActionsByStatus";
import { PreviousShiftSummaryCard } from "@/features/home/components/PreviousShiftSummaryCard";
import { ShiftKpis } from "@/features/home/components/ShiftKpis";
import {
  DueDateRagCard,
  FlarePurgeCard,
  NextShipsCard,
  OletCard,
  OutOfServiceCard,
  ProductionTrendCard,
} from "@/features/plant-ops/components/PlantOpsCards";
import {
  ActiveUsersCard,
  LogbookComplianceCard,
  SystemHealthCard,
} from "@/features/platform/components/PlatformCards";

/**
 * Widget id → what it renders. The join between **FR-DASH-02**'s configuration
 * and **FR-HOME-01**'s dashboard.
 *
 * ## Keyed by id, not by label
 *
 * A label is editable copy; an id is the contract. Keying this by
 * `"Shift KPIs"` would mean a Super User renaming a widget silently blanked it,
 * which is the kind of failure nobody connects to the rename that caused it.
 *
 * ## A widget with no entry renders nothing, on purpose
 *
 * `Repeating Issues` (WID-005) is the live case: **FR-AN-06** records its
 * counting definitions as *"to be confirmed"*, so it ships in the library —
 * disabled — with no renderer. It is assignable, and it draws nothing until
 * somebody defines what a recurrence is. Returning `null` rather than throwing
 * is what lets the backend add a widget id this build has never heard of
 * without white-screening every dashboard that was assigned it.
 *
 * The alternative — a `Record<WidgetId, Renderer>` that fails to compile on a
 * missing entry — is the right shape when the set is closed (`WORKFLOW_COPY`
 * uses it). This set is not closed: the library is server-owned data.
 */

/** Every widget the dashboard can currently draw. */
const RENDERERS: Record<string, () => ReactNode> = {
  "WID-001": () => <ShiftKpis />,
  "WID-002": () => (
    <LatestSummarySection
      kind="activities"
      title="Current shift highlights"
      icon={ClipboardList}
      emptyTitle="No activities recorded"
      emptyDescription="Nothing has been logged for the last completed shift."
    />
  ),
  "WID-003": () => (
    <LatestSummarySection
      kind="critical_alarms"
      title="Critical alarms"
      icon={TriangleAlert}
      emptyTitle="No critical alarms"
      emptyDescription="The last completed shift recorded none."
    />
  ),
  "WID-004": () => <PreviousShiftSummaryCard />,
  "WID-006": () => (
    <LatestSummarySection
      kind="safety_observations"
      title="Safety observations"
      icon={ShieldCheck}
      emptyTitle="No safety observations"
      emptyDescription="None were raised on the last completed shift."
    />
  ),
  "WID-007": () => <PendingActionsByStatus />,

  /*
    WID-008 … WID-013 — the prototype's `specKpiSection()` cards (751).

    ⚠️ **No BRD requirement covers these six.** They are built at the owner's
    request from invented figures; `features/plant-ops/schemas.ts` records what
    that means, and — since the owner had the on-screen banner removed — is now
    the only place that says so. They are registered here rather than hardcoded
    into a screen so that a Super User can unassign them (FR-DASH-02) and any
    user can hide them (FR-DASH-04) — which is the right place for a decision
    about unratified content.
  */
  "WID-008": () => <DueDateRagCard />,
  "WID-009": () => <ProductionTrendCard />,
  "WID-010": () => <OutOfServiceCard />,
  "WID-011": () => <FlarePurgeCard />,
  "WID-012": () => <OletCard />,
  "WID-013": () => <NextShipsCard />,

  /*
    WID-014 … WID-016 — the Super User dashboard's widgets
    (`defaultWidgets('superuser')`, app-source.txt 139).

    ⚠️ **No BRD requirement covers these three**, for the same reason as the six
    above: §6.5 describes the Super User's job rather than their home screen.
    `features/platform/schemas.ts` records which figures are inventions.

    They are registered here rather than hardcoded into the dashboard so that
    all three remain hideable, resizable and reorderable (FR-DASH-04) and
    assignable to another role without a deploy — the same argument the
    plant-ops cards make.
  */
  "WID-014": () => <ActiveUsersCard />,
  "WID-015": () => <SystemHealthCard />,
  "WID-016": () => <LogbookComplianceCard />,
};

/**
 * Widget ids whose data has no requirement behind it.
 *
 * This used to select which widgets got a "Sample data" banner. That banner was
 * removed at the owner's request, so nothing renders from this set today — it
 * survives as the executable record of *which* six widgets are fabricated
 * (pinned by `PlantOpsCards.test.tsx`) and as the hook a notice would use if the
 * decision is revisited.
 */
const ILLUSTRATIVE = new Set([
  "WID-008",
  "WID-009",
  "WID-010",
  "WID-011",
  "WID-012",
  "WID-013",
]);

export const isIllustrativeWidget = (id: string): boolean =>
  ILLUSTRATIVE.has(id);

/**
 * The Super User dashboard's three widgets. Fabricated too, and kept separate
 * from `ILLUSTRATIVE` because the two sets are about different content —
 * headcounts and uptime rather than equipment tags and vessel schedules — and
 * `features/platform/schemas.ts` documents them separately.
 *
 * Both sets once chose between two differently-worded on-screen caveats.
 * Neither caveat renders any more (owner decision), so the split is now purely
 * descriptive.
 */
const PLATFORM_WIDGETS = new Set(["WID-014", "WID-015", "WID-016"]);

export const isPlatformWidget = (id: string): boolean =>
  PLATFORM_WIDGETS.has(id);

/**
 * Widgets that span both columns before anybody personalises anything — the
 * prototype's `w.wide` (app-source.txt 1147), as a starting position rather
 * than a fixed property.
 *
 * Only the KPI strip: it is four tiles in a row, and half-width it wraps to a
 * 2×2 block that reads as four unrelated numbers. Everything else is a list or
 * a chart that is legible in one column, so the default is narrow and a user
 * who wants otherwise has **FR-DASH-04**'s expand control.
 */
/*
  Which cards the prototype wraps in `this.full(...)` — its own full-width
  marker — read off `specKpiSection`'s members rather than guessed:
  `dueDateBars` (561), `secKpiTrend` (692), `outOfServiceCard` (715) and
  `nextShipCard` (747) are full; `flarePurgeCard` (737) and `oletCard` (721)
  are not, which is why those two sit side by side.
*/
const DEFAULT_WIDE = new Set([
  "WID-001",
  "WID-008",
  "WID-009",
  "WID-010",
  "WID-013",
]);

export const isWideByDefault = (id: string): boolean => DEFAULT_WIDE.has(id);

export const hasRenderer = (id: string): boolean => id in RENDERERS;

export const renderWidget = (id: string): ReactNode =>
  RENDERERS[id]?.() ?? null;
