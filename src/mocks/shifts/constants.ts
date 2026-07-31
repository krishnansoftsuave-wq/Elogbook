/**
 * The shift arithmetic's constants, in a **leaf module with no imports**.
 *
 * They lived in `current.ts` until Phase 3b, and moving them is what lets the
 * shift become configurable: `mocks/data/admin.ts` seeds the shift-config
 * fixture from these values, and `currentShift` needs the same numbers as its
 * defaults. With both in `current.ts` the graph closed —
 * `current → store → data/admin → current` — and `data/admin.ts` evaluates
 * `NIGHT_START_HOUR` at module scope, so the cycle was not the benign kind: the
 * first entry to evaluate it would hit the temporal dead zone and throw
 * `Cannot access 'SHIFT_START_HOUR' before initialization`.
 *
 * A leaf breaks it. Nothing here imports anything, so nothing can point back.
 */

/**
 * The hour the day shift opens, **in plant time**.
 *
 * ⚠️ This was documented as UTC until Phase 3b, and that was a real defect on a
 * live screen. `ShiftContextBanner` renders the wire instant through
 * `formatPlantTime`, which formats in `Asia/Muscat` — so a day shift starting at
 * 06:00 UTC displayed as **"10:00–22:00 GST"** while **FR-HOME-03** says
 * *"06:00–18:00"*.
 *
 * The old reasoning was that `authentication_flow.md` §7's example prints
 * `+00:00` offsets, so the boundary must be UTC. That confuses the *spelling* of
 * an instant with the clock it refers to: `+00:00` says how the timestamp is
 * serialised, not that Oman LNG's control room changes shift at ten in the
 * morning. `lib/datetime.ts` already reasons correctly in the other direction —
 * "fixing the zone is therefore a correctness decision, not a formatting
 * preference" — and the two files contradicted each other for three phases.
 */
export const SHIFT_START_HOUR = 6;

/** §7 and FR-HOME-03: two 12-hour shifts a day. */
export const SHIFT_LENGTH_HOURS = 12;

/** The 06:00–06:15 handover window (FR-HOME-03). */
export const SHIFT_OVERLAP_MINUTES = 15;

/**
 * Asia/Muscat is GST, UTC+4, and observes **no daylight saving** — which is what
 * makes a fixed offset correct here rather than a lazy approximation. The same
 * fact is why `lib/datetime.ts` can pin a zone and never revisit it.
 */
export const PLANT_UTC_OFFSET_HOURS = 4;

export const HOUR_MS = 60 * 60 * 1000;
