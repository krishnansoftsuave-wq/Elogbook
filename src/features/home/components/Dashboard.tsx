"use client";

import { LayoutTemplate } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLES } from "@/constants/roles";
import { useRoleVariant } from "@/features/auth/hooks/useRoleVariant";
import { PersonaliseBar } from "@/features/dashboards/components/PersonaliseBar";
import { WidgetFrame } from "@/features/dashboards/components/WidgetFrame";
import { useDashboardArrangement } from "@/features/dashboards/hooks/useDashboardArrangement";
import { renderWidget } from "@/features/dashboards/widgetRegistry";
import { ShiftContextBanner } from "@/features/home/components/ShiftContextBanner";
import { SystemMonitor } from "@/features/monitoring/components/SystemMonitor";
import { LogbookActivityCard } from "@/features/platform/components/PlatformCards";
import { useCurrentShift } from "@/features/shifts/api/queries";
import { formatShiftDate } from "@/lib/datetime";

/**
 * The operations dashboard — **FR-HOME-01**: "current-shift highlights (events,
 * pending actions, safety observations, repeating issues); layout may vary by
 * role."
 *
 * Every role except the Administrator, whose home §6.4 defines as a *"System
 * Administration dashboard"* instead. `Dashboard` at the foot of this file is
 * the dispatcher.
 *
 * ## Composed from configuration, not hardcoded
 *
 * This screen used to list its six cards literally. It now renders whatever
 * the widget library says this role is assigned — **FR-DASH-01**'s
 * "predefined, role-based dashboards … for standardisation", where the
 * predefinition is the Super User's (**FR-DASH-02**, `/dashboards`) rather than
 * this file's.
 *
 * That indirection is the entire point of §7.12 and it is what makes "layout
 * may vary by role" true without a `switch (role)` anywhere: an Operator and a
 * Superintendent differ because their assignments differ, and changing either
 * is a toggle rather than a deploy. `useRoleWidgets` holds the selection rules;
 * `widgetRegistry` holds the id → component map.
 *
 * ## Why this is still not the prototype's dashboard
 *
 * `specDashboard()` (`app-source.txt` 1122–1131) renders none of FR-HOME-01's
 * four. It is a plant-ops KPI board — Safety KPI, Production 7-Day Trend,
 * Equipment Out of Service, Flare Purge Medium, OLET, Next Ships — and **all
 * six cards hold literal arrays inside their own function bodies** (546–748).
 * Nothing of theirs is in `state`, so there is no mock entity to derive a
 * schema from. They are built separately, from seeds labelled illustrative,
 * rather than folded in here as though a requirement asked for them.
 *
 * ## What is deliberately missing
 *
 * - **Repeating issues.** FR-AN-01's recurring-issue detection, whose counting
 *   definitions **FR-AN-06 records as "to be confirmed"**. It ships in the
 *   library as an assignable, disabled widget with no renderer — configuration
 *   without a drawing, which is exactly the state of the requirement.
 * - **"Events" as source-system log entries.** The platform reads the E-Logbook
 *   but does not own it (FR-DATA-01) and no Phase 0a contract exposes entries,
 *   so the summary's Activities section stands in — which is what a handover
 *   report calls the same thing.
 *
 * ## FR-HOME-02 and FR-HOME-05
 *
 * Nothing here reads an area scope. FR-HOME-02 requires the default view to be
 * "everything the user may see (full plant)", and §9.2 records that the client
 * removed area filtering outright.
 *
 * Every query on this screen carries `DASHBOARD_REFRESH` — a one-minute
 * `refetchInterval` that pauses in a background tab. `lib/query-refresh.ts`
 * records why `staleTime` alone was wrong.
 */
const OperationsDashboard = () => {
  const [personalising, setPersonalising] = useState(false);
  /** The widget being dragged, so a drop target knows what to move. */
  const [dragId, setDragId] = useState<string | null>(null);
  const { role } = useRoleVariant();

  /** See the note beside `PersonaliseBar` — owner decision, not FR-DASH-04. */
  const canPersonalise = role === ROLES.SUPER_USER;
  /*
    Already fetched by `ShiftContextBanner` below, so this is a cache read rather
    than a second request — the shared query key is what makes the heading and
    the banner incapable of naming different shifts.
  */
  const { data: shift } = useCurrentShift();
  const {
    arranged,
    visible,
    isLoading,
    widgetsError,
    layoutError,
    isSaving,
    isPersonalised,
    setHidden,
    setWide,
    move,
    reset,
  } = useDashboardArrangement();

  /*
    Personalise mode shows every assigned widget, hidden ones dimmed, so the
    control that brings one back is beside the card it affects. Normal mode
    renders only what is visible, so a hidden widget costs no requests.
  */
  const shown = personalising ? arranged : visible;

  /*
    "Day shift · 24 Jun 2026" — the prototype's own subtitle (app-source.txt
    1124), which is the current shift rather than a tagline. It replaced
    "Current-shift highlights across the whole plant.", a sentence that told a
    reader nothing the heading had not already said.

    Rendered only once the shift resolves: a subtitle that appears, then changes,
    reads as a correction. The heading alone is a complete header until then.
  */
  const shiftSubtitle = shift
    ? `${shift.label} shift · ${formatShiftDate(shift.shiftId.split("-")[0] ?? "")}`
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Operations Dashboard"
        description={shiftSubtitle}
        /*
          ## Super User only — an owner decision that departs from the BRD

          **FR-DASH-04 grants limited personalisation to "All roles"**, and this
          hides the control from four of the five. The owner asked for it, so it
          ships, but the divergence is named rather than buried: an Operator
          currently cannot hide or reorder a card, which is the requirement's
          primary case.

          Reversing it is deleting `canPersonalise` — the arrangement API, the
          per-user layout endpoint and FR-DASH-05's isolation are all role-blind
          and stay working, so nothing else has to change.

          In the header rather than above the grid because that is where the
          prototype puts it: `dashboard()`'s head is a `space-between` row with
          the heading on the left and `Personalize` on its right (1136–1141),
          and the personalising state swaps in Reset and Save on the same row.
          Below the title it read as a control over the first card instead of
          over the screen.

          Gated on three things: the role, there being something to arrange (the
          control does nothing on an empty dashboard), and the saved layout
          having actually loaded. That last one matters — on a failed read the
          hook falls back to the role's default order, so personalising would
          have written that default over the user's real, unread layout, and the
          write would have succeeded silently. `persist` refuses independently;
          this is what stops the user being offered the action at all.
        */
        actions={
          canPersonalise && !layoutError && arranged.length > 0 ? (
            <PersonaliseBar
              personalising={personalising}
              isPersonalised={isPersonalised}
              isSaving={isSaving}
              onToggle={() => setPersonalising((current) => !current)}
              onReset={reset}
            />
          ) : null
        }
      />

      {/*
        Outside the widget system on purpose. The banner is not a metric a role
        might be denied — it is the answer to "which shift am I looking at",
        without which every card below it is ambiguous (FR-HOME-03).
      */}
      <ShiftContextBanner />

      {/*
        ## Super User only, and outside the widget system

        The prototype puts `logKpiCard()` above the widget grid, before the
        `widgets.map` and with no drag handle, hide control or resize
        (app-source.txt 1146). It is not one card among four — it is the frame
        for the four, the same argument `ShiftContextBanner` above makes for
        itself, so it is rendered here rather than registered as a widget.

        Only for the Super User because only the Super User reaches the
        prototype's `dashboard()` at all: `admin` is dispatched to
        `adminDashboard` and every operational role to `specDashboard`, neither
        of which draws this card. Giving it to an Operator would be inventing a
        screen rather than porting one.
      */}
      {role === ROLES.SUPER_USER ? <LogbookActivityCard /> : null}

      {/*
        Two failures, two messages. They used to be merged into one `isError`
        whose copy said "the cards below cannot be shown" — which the render
        contradicted, because the grid is gated on `arranged.length`, not on the
        error. A failed *layout* read leaves six fully-populated cards sitting
        directly under a notice claiming they are absent.

        Only the widget-library failure actually empties the screen. A layout
        failure costs this user their arrangement and nothing else, so it says
        so, and says what is unavailable as a result.
      */}
      {widgetsError ? (
        <Notice live>
          The dashboard could not be loaded, so the cards below cannot be shown.
          Reload to try again.
        </Notice>
      ) : null}

      {!widgetsError && layoutError ? (
        <Notice live>
          Your saved layout could not be loaded, so the cards are in the default
          order for your role. Personalisation is unavailable until it loads.
        </Notice>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : null}

      {!isLoading && !widgetsError && arranged.length === 0 ? (
        /*
          Reachable, and not an error: a Super User can unassign every widget
          from a role. Saying so — and naming who can change it — beats a blank
          page that reads as a failed load.

          Keyed on `widgetsError` alone. A layout failure does not empty the
          dashboard, so suppressing this on it would have hidden a genuinely
          empty assignment behind an unrelated fault.
        */
        <EmptyState
          icon={LayoutTemplate}
          title="No dashboard widgets are assigned to your role yet"
          description="A Super User or Administrator can add them from Dashboard configuration."
        />
      ) : null}

      {/*
        ⚠️ A "Sample data" banner used to render here, on every role, and was
        **removed at the owner's request** so the dashboard matches the
        prototype. The figures it warned about are unchanged — see the note
        above `usePlantOpsCard` in `plant-ops/components/PlantOpsCards.tsx` for
        what that costs and how to put it back.
      */}

      {arranged.length > 0 ? (
        <>
          {/*
            The prototype's `1fr 1fr` grid (1164), which is what makes the
            expand control mean something — a card can span both columns. One
            column below `xl`, where there is no second column to span.
          */}
          <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
            {shown.map((item, index) => (
              <WidgetFrame
                key={item.widget.id}
                label={item.widget.label}
                hidden={item.hidden}
                wide={item.wide}
                personalising={personalising}
                isFirst={index === 0}
                isLast={index === shown.length - 1}
                isSaving={isSaving}
                onToggleHidden={() => setHidden(item.widget.id, !item.hidden)}
                onToggleWide={() => setWide(item.widget.id, !item.wide)}
                /*
                  Indices are into `arranged`, not into the rendered list. They
                  are the same array in personalise mode — the only mode with
                  move buttons — and deriving them from `shown` would silently
                  break if that ever stopped being true.
                */
                onMoveUp={() => move(item.widget.id, index - 1)}
                onMoveDown={() => move(item.widget.id, index + 1)}
                /*
                  Native HTML5 drag — the prototype's own mechanism (1155–1158),
                  and the reason no drag library is needed: the browser draws the
                  drag image, so nothing here sets a `style` transform, which
                  `eslint.config.mjs:56` would have refused.

                  The move buttons stay. Native drag is not keyboard-operable, so
                  removing them would put reordering out of reach for a keyboard
                  user and fail `.claude/rules/03`'s WCAG bar. Two paths to one
                  `move()` call.
                */
                isDragging={dragId === item.widget.id}
                onDragStart={() => setDragId(item.widget.id)}
                onDragEnd={() => setDragId(null)}
                onDropOn={() => {
                  if (dragId && dragId !== item.widget.id) {
                    move(dragId, index);
                  }
                  setDragId(null);
                }}
              >
                {renderWidget(item.widget.id)}
              </WidgetFrame>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

/**
 * The dashboard dispatcher — the prototype's own first line
 * (`if (st.role === 'admin') return this.adminDashboard()`, app-source.txt
 * 1135).
 *
 * **This is the one place a role is branched on, and it is not a layout
 * decision.** Everywhere else, "layout may vary by role" (FR-HOME-01) is
 * answered by widget assignment. Here the two dashboards are different
 * *screens* answering different requirements — FR-HOME-01's current-shift
 * highlights against FR-OBS-04's platform telemetry — with no widget in common,
 * so expressing the choice as configuration would mean assigning an
 * Administrator zero operational widgets and hoping the empty state was read as
 * intentional.
 *
 * It also resolves what the widget model could not: §7.12's config screen has
 * columns for Operator, Supervisor and Management only (FR-DASH-01), so nothing
 * in the UI could ever have given the Administrator a dashboard.
 *
 * The Super User is deliberately **not** here. §6.5 makes their job dashboard
 * and permission management, so their home is `/dashboards`; reaching
 * `/dashboard` they get the operations view through `useRoleWidgets`'
 * published-set fallback, which is a reasonable answer rather than a designed
 * one.
 */
export const Dashboard = () => {
  const { role } = useRoleVariant();

  return role === ROLES.ADMINISTRATOR ? (
    <SystemMonitor />
  ) : (
    <OperationsDashboard />
  );
};
