import type { CurrentShiftData } from "@/features/shifts/schemas";

/**
 * §7: "Computed live from server time + config (12-hour shifts, 06:00 start,
 * 15-min overlap) — not a database read yet." This is that computation, and it
 * is the whole mock: there is no fixture to go stale.
 *
 * BRD FR-HOME-04 states the same model from the product side — a 12-hour shift
 * with a 06:00–06:15 overlap — and adds that it is Admin-configurable. The
 * constants below are therefore the *defaults*, not the rule; when the admin
 * configuration endpoint lands they become its response.
 *
 * Everything is computed in UTC because §7's example prints `+00:00`
 * offsets. GST (UTC+4) is the timezone the BRD names for *display* (FR-AI-02,
 * "timestamp (GST)"), which is a formatting concern for the screen that renders
 * this, not a change to the wire value.
 */

/** Hour the day shift opens, UTC. */
export const SHIFT_START_HOUR = 6;

/** §7 and FR-HOME-04: two 12-hour shifts a day. */
export const SHIFT_LENGTH_HOURS = 12;

/** The 06:00–06:15 handover window. */
export const SHIFT_OVERLAP_MINUTES = 15;

const HOUR_MS = 60 * 60 * 1000;

/** `20260730` — the date part of a shift id, from a UTC instant. */
const dateKey = (date: Date): string =>
  [
    date.getUTCFullYear().toString().padStart(4, "0"),
    (date.getUTCMonth() + 1).toString().padStart(2, "0"),
    date.getUTCDate().toString().padStart(2, "0"),
  ].join("");

/**
 * `+00:00` rather than `Z`. Same instant, but the spelling §7 shows — and the
 * one `mocks/envelope.ts` already normalises `meta.timestamp` to, so a consumer
 * never meets two spellings in one response.
 */
const isoWithOffset = (date: Date): string =>
  date.toISOString().replace(/Z$/, "+00:00");

/**
 * The shift covering `at`.
 *
 * The subtraction is what makes the pre-dawn case correct: at 02:00 on the 30th
 * the live shift is the night shift that opened at 18:00 on the **29th**, so
 * its id is `20260729-N`. Shifting the clock back by the start hour before
 * taking the date means the boundary falls out of the arithmetic instead of
 * needing a special case.
 */
export const currentShift = (at: Date = new Date()): CurrentShiftData => {
  const shiftedMs = at.getTime() - SHIFT_START_HOUR * HOUR_MS;
  const shiftIndex = Math.floor(shiftedMs / (SHIFT_LENGTH_HOURS * HOUR_MS));

  const startsAt = new Date(
    shiftIndex * SHIFT_LENGTH_HOURS * HOUR_MS + SHIFT_START_HOUR * HOUR_MS
  );
  const endsAt = new Date(startsAt.getTime() + SHIFT_LENGTH_HOURS * HOUR_MS);

  // Even index = the shift that opens at 06:00; odd = the one at 18:00.
  const isDay = Math.abs(shiftIndex % 2) === 0;

  return {
    shift_id: `${dateKey(startsAt)}-${isDay ? "D" : "N"}`,
    label: isDay ? "Day" : "Night",
    starts_at: isoWithOffset(startsAt),
    ends_at: isoWithOffset(endsAt),
    overlap_minutes: SHIFT_OVERLAP_MINUTES,
  };
};
