/**
 * Dates and times, rendered in **plant time**.
 *
 * Oman LNG runs on Gulf Standard Time, and every shift fact in this product is
 * anchored to it: FR-HOME-03 defines the shift as 06:00–18:00 with a 06:00–06:15
 * overlap, and FR-AI-05 requires each cited answer to carry a "timestamp (GST)".
 * Those boundaries are plant-local, so rendering a shift timestamp in the
 * viewer's own zone would put an 18:05 handover at 15:05 for anyone demoing from
 * Europe — the number would disagree with the shift window printed beside it.
 *
 * Fixing the zone is therefore a correctness decision, not a formatting
 * preference. `Asia/Muscat` is GST (UTC+4) and observes no daylight saving, so
 * the offset never moves.
 *
 * ⚠️ This is right for **shift and summary** data. It would be wrong for a
 * per-user activity log, where a reader wants their own clock — that distinction
 * is why these are named `plant*` rather than `formatDate`.
 */

const PLANT_TIME_ZONE = "Asia/Muscat";

/** The label GST carries in the UI. FR-AI-05's spelling. */
export const PLANT_TIME_ZONE_LABEL = "GST";

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: PLANT_TIME_ZONE,
});

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: PLANT_TIME_ZONE,
});

const TIME = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: PLANT_TIME_ZONE,
});

/**
 * `YYYYMMDD` → `10 Jun 2025`.
 *
 * This is the spelling `shift_date` and the date half of a `shift_id` use. It is
 * a **calendar date, not an instant** — the day a shift belongs to — so it is
 * assembled at UTC noon rather than midnight. Midnight would sit close enough to
 * a zone boundary that a formatter could render the day before.
 *
 * An unparseable value returns the input unchanged: a table cell showing a raw
 * `20250610` is a legible symptom, whereas "Invalid Date" or an empty cell is
 * not.
 */
export const formatShiftDate = (yyyymmdd: string): string => {
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd;

  const year = Number(yyyymmdd.slice(0, 4));
  const month = Number(yyyymmdd.slice(4, 6));
  const day = Number(yyyymmdd.slice(6, 8));
  const at = new Date(Date.UTC(year, month - 1, day, 12));

  return Number.isNaN(at.getTime()) ? yyyymmdd : DATE.format(at);
};

/** An ISO instant → `10 Jun, 14:45`. Empty string when unparseable. */
export const formatPlantDateTime = (iso: string): string => {
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? "" : DATE_TIME.format(parsed);
};

const TIMESTAMP = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: PLANT_TIME_ZONE,
});

/**
 * An ISO instant → `10 Jun 2025, 14:45`. An em dash when unparseable, because
 * every caller renders this in a field where blank would read as missing data.
 *
 * The long form, for a detail screen where the year matters — a due date months
 * out, or a creation date from a previous year.
 */
export const formatPlantTimestamp = (iso: string): string => {
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? "—" : TIMESTAMP.format(parsed);
};

/** An ISO instant → `18:05 GST`. Empty string when unparseable. */
export const formatPlantTime = (iso: string): string => {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "";
  return `${TIME.format(parsed)} ${PLANT_TIME_ZONE_LABEL}`;
};

/**
 * An ISO instant → `10 min ago` / `2h ago` / `Yesterday` / `3 d ago`, relative
 * to `at` — the prototype's notification timestamps (`app-source.txt` 78–81).
 *
 * `at` is a required, caller-supplied instant rather than an internal
 * `new Date()`, the same rule `OverdueFlag` follows: a bare `new Date()` in a
 * render body evaluates the server and client clocks separately, and two
 * different "now"s can render two different strings for the same element,
 * which React reports as a hydration mismatch. Callers pass `useNow()`.
 *
 * Beyond a week, "ago" stops being the useful answer and the actual date is,
 * so this falls back to `formatPlantDateTime`. Empty string when unparseable.
 */
export const formatRelativeTime = (iso: string, at: Date): string => {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "";

  const diffMin = Math.round((at.getTime() - parsed) / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} d ago`;

  return formatPlantDateTime(iso);
};
