/**
 * Fixture timestamps, expressed relative to the moment the store is seeded.
 *
 * The prototype hardcodes display strings — `due:'10 Jun 18:00'`,
 * `date:'22 Jun 2026'` (app-source.txt 41, 62). Two problems with porting those
 * literally: they are not parseable, so FR-PA-06's overdue flag cannot be
 * derived from them; and they are frozen in June 2026, so within a week every
 * fixture reads as ancient and *everything* is overdue. A demo where all
 * fourteen actions are red teaches nothing.
 *
 * Relative offsets keep the mix intentional — a couple genuinely overdue, some
 * due this week, some comfortably ahead — on whatever day the demo runs.
 */

const HOUR_MS = 60 * 60 * 1000;

/**
 * `+00:00` rather than `Z`. Same instant, but the spelling `mocks/envelope.ts`
 * already normalises `meta.timestamp` to, so a consumer never meets two
 * spellings of an ISO timestamp in one response.
 */
export const isoWithOffset = (date: Date): string =>
  date.toISOString().replace(/Z$/, "+00:00");

/** Negative is the past. `hoursFromBase(-30)` is thirty hours ago. */
export const hoursFromBase = (offsetHours: number, base: Date): string =>
  isoWithOffset(new Date(base.getTime() + offsetHours * HOUR_MS));

export const daysFromBase = (offsetDays: number, base: Date): string =>
  hoursFromBase(offsetDays * 24, base);
