"use client";

import { ClipboardList, ShieldCheck, TriangleAlert } from "lucide-react";

import { LatestSummarySection } from "@/features/home/components/LatestSummarySection";
import { PendingActionsByStatus } from "@/features/home/components/PendingActionsByStatus";
import { PreviousShiftSummaryCard } from "@/features/home/components/PreviousShiftSummaryCard";
import { ShiftContextBanner } from "@/features/home/components/ShiftContextBanner";
import { ShiftKpis } from "@/features/home/components/ShiftKpis";

/**
 * The role-based dashboard **FR-AUTH-01** redirects to and **FR-HOME-01**
 * defines: "current-shift highlights (events, pending actions, safety
 * observations, repeating issues); layout may vary by role."
 *
 * ## Why this is not the prototype's dashboard
 *
 * `specDashboard()` (`app-source.txt` 1122–1131) renders none of those four. It
 * is a plant-ops KPI board — Safety KPI, Production 7-Day Trend, Equipment Out
 * of Service, Flare Purge Medium, OLET, Next Ships — and **all six cards hold
 * literal arrays inside their own function bodies** (546–748). Nothing of theirs
 * is in `state`, so there is no mock entity to derive a schema from, and
 * building them would mean inventing LNG production figures and berthing
 * schedules. Precedence is BRD → prototype, and `.claude/rules/08` forbids
 * inventing a requirement, so those six are reported rather than built.
 *
 * The prototype *does* answer FR-HOME-01 — in `state.dashWidgets` (112), the
 * admin-side declaration of what the operator dashboard contains:
 *
 * ```
 * Shift KPIs · Current Shift Highlights · Critical Alarms ·
 * Previous Shift Summary Report · Repeating Issues (disabled)
 * ```
 *
 * That is what is built here, plus Safety Observations, which FR-HOME-01 names
 * and the summary already carries.
 *
 * ## What is deliberately missing
 *
 * - **Repeating issues.** FR-AN-01's recurring-issue detection, whose counting
 *   definitions **FR-AN-06 records as "to be confirmed"**. Disabled in the
 *   prototype, undefined in the BRD, and no contract carries it. Inventing a
 *   recurrence rule would be inventing a requirement.
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
 * `refetchInterval` that pauses in a background tab.
 *
 * An earlier version had `staleTime: 60_000` and no interval, arguing that
 * NFR-03's 500+ concurrent users ruled polling out. That was wrong twice:
 * `staleTime` schedules no fetch, and with `refetchOnWindowFocus` also disabled
 * globally the screen never refreshed at all — a control-room display showed its
 * first-paint numbers until someone reloaded. NFR-03 is a scalability target met
 * "via autoscaling"; it cannot delete FR-HOME-05, which asks for the refresh in
 * as many words. `lib/query-refresh.ts` records the whole argument.
 */
export const Dashboard = () => (
  <div className="flex flex-col gap-6">
    <ShiftContextBanner />

    <ShiftKpis />

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
      <div className="flex flex-col gap-6">
        <LatestSummarySection
          kind="critical_alarms"
          title="Critical alarms"
          icon={TriangleAlert}
          emptyTitle="No critical alarms"
          emptyDescription="The last completed shift recorded none."
        />
        <LatestSummarySection
          kind="activities"
          title="Current shift highlights"
          icon={ClipboardList}
          emptyTitle="No activities recorded"
          emptyDescription="Nothing has been logged for the last completed shift."
        />
        <LatestSummarySection
          kind="safety_observations"
          title="Safety observations"
          icon={ShieldCheck}
          emptyTitle="No safety observations"
          emptyDescription="None were raised on the last completed shift."
        />
      </div>

      <div className="flex flex-col gap-6">
        <PendingActionsByStatus />
        <PreviousShiftSummaryCard />
      </div>
    </div>
  </div>
);
