/**
 * **FR-HOME-05** — "Refresh on-screen information in **near-real-time (target
 * ~1 minute)**."
 *
 * Spread into any query whose result is watched on a screen that stays open: the
 * dashboard's shift banner, its action counts, its summary sections.
 *
 * ### Why `staleTime` alone was not this
 *
 * An earlier version of these hooks carried `staleTime: 60_000` and no interval,
 * on the reasoning that NFR-03's "500+ concurrent users" ruled out polling. That
 * reading was wrong twice over.
 *
 * `staleTime` schedules nothing. It marks cached data stale so that *the next
 * thing that would refetch* is allowed to; with `refetchOnWindowFocus: false`
 * also set globally (`lib/query-client.ts:33`), nothing ever did. A control-room
 * display left on the dashboard — which is precisely the device NFR-08 names —
 * showed its first-paint numbers until somebody reloaded the page. A shift
 * changing at 06:00, a new critical alarm, an action crossing its due date:
 * none of it arrived.
 *
 * And NFR-03 does not argue against refreshing. It is a *scalability* target met
 * "via autoscaling"; FR-HOME-05 is a functional requirement that asks for the
 * refresh in as many words. A non-functional target cannot delete a functional
 * requirement — and if the two genuinely collided, the BRD outranks the
 * inference, so the collision would be something to escalate rather than
 * silently resolve by doing nothing.
 *
 * ### What actually answers the load concern
 *
 * `refetchIntervalInBackground: false`. A hidden tab stops polling entirely, so
 * the cost scales with screens someone is *looking at* rather than with tabs
 * left open — which is the real shape of 500 concurrent users in a control room.
 * That is a bounded interval, not an unbounded one.
 *
 * `staleTime` is deliberately absent here: `lib/query-client.ts:30` already sets
 * exactly 60s globally, and restating it in each hook meant retuning the cadence
 * in one place would silently miss the three that had pinned their own.
 */
export const DASHBOARD_REFRESH = {
  refetchInterval: 60_000,
  /** A tab nobody is looking at costs nothing (NFR-03). */
  refetchIntervalInBackground: false,
} as const;
