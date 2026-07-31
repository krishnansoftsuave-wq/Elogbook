import type { ShiftConfigWire } from "@/features/admin/schemas";
import type { CurrentShiftData } from "@/features/shifts/schemas";
import {
  HOUR_MS,
  PLANT_UTC_OFFSET_HOURS,
  SHIFT_LENGTH_HOURS,
  SHIFT_OVERLAP_MINUTES,
  SHIFT_START_HOUR,
} from "@/mocks/shifts/constants";

/**
 * §7: "Computed live from server time + config (12-hour shifts, 06:00 start,
 * 15-min overlap) — not a database read yet." This is that computation, and it
 * is the whole mock: there is no fixture to go stale.
 *
 * ## Plant time, not UTC
 *
 * Every boundary here is **plant-local** (`Asia/Muscat`, GST, UTC+4, no DST).
 * **FR-HOME-03** — *"Define a shift as a 12-hour period (06:00–06:15 overlap)"*
 * — describes an Omani control room's clock, not Greenwich's. Computing at 06:00
 * UTC and rendering through `formatPlantTime` put "10:00–22:00 GST" on the
 * dashboard for three phases; `constants.ts` records why that reasoning was
 * wrong.
 *
 * The *wire* value stays a UTC instant with a `+00:00` offset, which is what §7
 * shows and what `lib/datetime.ts` expects to format. Only the arithmetic moved.
 *
 * ## The config is a parameter, not a store read
 *
 * **FR-HOME-03** also makes the boundary Administrator-configurable, and
 * `/admin/shift-config` now edits it. Taking the config as an argument rather
 * than reaching for `mockStore()` keeps this a pure function of its inputs:
 * there is no import cycle to break, the tests need no `resetMockStore()`, and
 * a reader can see at each call site which config a shift was computed against.
 * The three callers — `shifts/current`, `summaries` POST and `assistant/query` —
 * pass `mockStore().shiftConfig`.
 */

/** The seeded defaults, for a caller with no configuration to hand. */
const DEFAULT_START_MINUTES = SHIFT_START_HOUR * 60;

/** `"06:00"` → `360`. Falls back to the default on anything unparseable. */
const minutesOfDay = (clockTime: string): number => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(clockTime);
  if (!match) return DEFAULT_START_MINUTES;
  return Number(match[1]) * 60 + Number(match[2]);
};

/**
 * `20260730` — the date part of a shift id, from a **plant-local** instant.
 *
 * The UTC getters are correct here precisely because the caller has already
 * added the plant offset: the value being read is a plant wall-clock moment
 * carried in a `Date`, so `getUTCDate()` reads the plant's calendar day. Reading
 * the true UTC date would name the wrong day for any shift crossing midnight
 * GST — which the night shift does, every night.
 */
const dateKey = (plantLocal: Date): string =>
  [
    plantLocal.getUTCFullYear().toString().padStart(4, "0"),
    (plantLocal.getUTCMonth() + 1).toString().padStart(2, "0"),
    plantLocal.getUTCDate().toString().padStart(2, "0"),
  ].join("");

/**
 * `+00:00` rather than `Z`. Same instant, but the spelling §7 shows — and the
 * one `mocks/envelope.ts` already normalises `meta.timestamp` to, so a consumer
 * never meets two spellings in one response.
 */
const isoWithOffset = (date: Date): string =>
  date.toISOString().replace(/Z$/, "+00:00");

/**
 * The shift covering `at`, computed against `config`.
 *
 * The subtraction is what makes the pre-dawn case correct: at 02:00 plant time
 * on the 30th the live shift is the night shift that opened at 18:00 on the
 * **29th**, so its id is `20260729-N`. Shifting the clock back by the start hour
 * before taking the date means the boundary falls out of the arithmetic instead
 * of needing a special case.
 */
export const currentShift = (
  at: Date = new Date(),
  config?: ShiftConfigWire
): CurrentShiftData => {
  const startMinutes = config
    ? minutesOfDay(config.day_start)
    : DEFAULT_START_MINUTES;
  const overlapMinutes = config?.overlap_minutes ?? SHIFT_OVERLAP_MINUTES;

  // Into plant-local milliseconds, where the configured boundary is a plain
  // wall-clock offset from midnight.
  const plantMs = at.getTime() + PLANT_UTC_OFFSET_HOURS * HOUR_MS;
  const shiftedMs = plantMs - startMinutes * 60_000;
  const shiftIndex = Math.floor(shiftedMs / (SHIFT_LENGTH_HOURS * HOUR_MS));

  const plantStartMs =
    shiftIndex * SHIFT_LENGTH_HOURS * HOUR_MS + startMinutes * 60_000;
  const plantEndMs = plantStartMs + SHIFT_LENGTH_HOURS * HOUR_MS;

  // Back to true instants for the wire.
  const startsAt = new Date(plantStartMs - PLANT_UTC_OFFSET_HOURS * HOUR_MS);
  const endsAt = new Date(plantEndMs - PLANT_UTC_OFFSET_HOURS * HOUR_MS);

  // Even index = the shift that opens at the configured hour; odd = 12h later.
  const isDay = Math.abs(shiftIndex % 2) === 0;

  return {
    shift_id: `${dateKey(new Date(plantStartMs))}-${isDay ? "D" : "N"}`,
    label: isDay ? "Day" : "Night",
    starts_at: isoWithOffset(startsAt),
    ends_at: isoWithOffset(endsAt),
    overlap_minutes: overlapMinutes,
  };
};
