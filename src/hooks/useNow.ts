"use client";

import { useEffect, useState } from "react";

/** FR-HOME-05: "Refresh on-screen information in near-real-time (target ~1 minute)." */
const REFRESH_MS = 60_000;

/**
 * "Now", safe to render, and moving.
 *
 * A client component still renders on the server in the App Router, so a bare
 * `new Date()` in a render body — or a `useMemo(() => new Date(), [])` — is
 * evaluated twice against two different clocks. Anything derived from it can
 * disagree between the server's HTML and the client's first render, which React
 * reports as a hydration mismatch. `isActionOverdue` is exactly that kind of
 * derivation: a due date two seconds away flips the answer.
 *
 * Returning `null` until after mount makes both first renders agree — nothing
 * time-dependent is in the server HTML — and the real instant arrives on the
 * effect. Callers treat `null` as "not yet known" and render nothing, which is
 * the honest answer rather than a guess.
 *
 * One instant per tick, deliberately: a table asks once and every row is judged
 * against the same moment, so two rows cannot disagree with each other.
 *
 * **And it advances.** A first version set the clock once on mount and never
 * again, which quietly broke FR-PA-06 on a screen left open — a control-room
 * shift is twelve hours (FR-HOME-03) and a due date passes during it. Worse, it
 * made the client disagree with the server: `GET /actions?overdue=true` computes
 * the flag at request time, so a row could arrive *because* it was overdue and
 * render without the badge. One interval at FR-HOME-05's cadence fixes both.
 *
 * The interval also settles the lint objection the first version worked around:
 * `setNow` inside a timer callback is not a synchronous set-state in an effect,
 * so there is no cascading render to defer.
 */
export const useNow = (): Date | null => {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // The first tick is scheduled, not immediate, so the server render and the
    // client's first render agree on `null` and nothing time-dependent can
    // mismatch during hydration.
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, REFRESH_MS);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, []);

  return now;
};
