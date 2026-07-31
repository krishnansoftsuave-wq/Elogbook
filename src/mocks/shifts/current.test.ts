import { describe, expect, it } from "vitest";

import type { ShiftConfigWire } from "@/features/admin/schemas";
import { currentShift } from "@/mocks/shifts/current";

/**
 * The arithmetic, not the plumbing — `routes.test.ts` covers the handler.
 *
 * ## Every boundary here is plant-local
 *
 * **FR-HOME-03** — *"Define a shift as a 12-hour period (06:00–06:15 overlap)"*
 * — describes an Omani control room's clock. `Asia/Muscat` is UTC+4 with no DST,
 * so the day shift opening at **06:00 GST** is the instant **02:00 UTC**, and
 * that is what the wire carries.
 *
 * These literals moved in Phase 3b. They previously read `06:00Z`, which put
 * "Day shift · 10:00–22:00 GST" on the dashboard once `ShiftContextBanner`
 * formatted them in plant time — a real defect these tests had pinned in place.
 * The *intent* of every case below is unchanged.
 */

const pad = (value: number): string => String(value).padStart(2, "0");

/**
 * A plant wall-clock time, as the instant it actually is.
 *
 * Built by parsing the wall clock **as if UTC** and then subtracting the offset,
 * rather than by adjusting the hour in the string — subtracting 4 from an hour
 * before 04:00 GST produces a negative hour and an `Invalid Date`, which is
 * exactly what the month-boundary case (03:00 GST) hit.
 */
const GST = (day: string, hour: number, minute = 0, second = 0): Date =>
  new Date(
    Date.parse(`${day}T${pad(hour)}:${pad(minute)}:${pad(second)}Z`) -
      4 * 60 * 60 * 1000
  );

describe("currentShift", () => {
  it("returns §7's worked example at midday", () => {
    // 13:58:47 GST on the 30th.
    expect(currentShift(new Date("2026-07-30T09:58:47Z"))).toEqual({
      shift_id: "20260730-D",
      label: "Day",
      // 06:00 and 18:00 GST, spelled as the UTC instants they are.
      starts_at: "2026-07-30T02:00:00.000+00:00",
      ends_at: "2026-07-30T14:00:00.000+00:00",
      overlap_minutes: 15,
    });
  });

  it("opens the day shift exactly at 06:00 plant time", () => {
    const shift = currentShift(GST("2026-07-30", 6));

    expect(shift.label).toBe("Day");
    expect(shift.starts_at).toBe("2026-07-30T02:00:00.000+00:00");
  });

  it("hands over to night exactly at 18:00 plant time", () => {
    const shift = currentShift(GST("2026-07-30", 18));

    expect(shift.shift_id).toBe("20260730-N");
    expect(shift.label).toBe("Night");
    expect(shift.starts_at).toBe("2026-07-30T14:00:00.000+00:00");
    expect(shift.ends_at).toBe("2026-07-31T02:00:00.000+00:00");
  });

  it("still reports the previous day's night shift at 05:59 plant time", () => {
    // The case a naive date read gets wrong: 05:59 GST on the 30th is worked by
    // the shift that opened at 18:00 GST on the 29th.
    const shift = currentShift(GST("2026-07-30", 5, 59, 59));

    expect(shift.shift_id).toBe("20260729-N");
    expect(shift.label).toBe("Night");
    expect(shift.starts_at).toBe("2026-07-29T14:00:00.000+00:00");
    expect(shift.ends_at).toBe("2026-07-30T02:00:00.000+00:00");
  });

  /**
   * The case that only exists because the boundary is plant-local: 01:00 GST on
   * the 1st is 21:00 UTC on the **31st**, so a UTC-keyed `dateKey` would have
   * named the shift `20260731-N` for the wrong reason and agreed by accident.
   * Here the plant calendar and the shift id have to agree deliberately.
   */
  it("crosses a month boundary without renaming the shift", () => {
    const shift = currentShift(GST("2026-08-01", 3));

    expect(shift.shift_id).toBe("20260731-N");
    expect(shift.starts_at).toBe("2026-07-31T14:00:00.000+00:00");
    expect(shift.ends_at).toBe("2026-08-01T02:00:00.000+00:00");
  });

  it("always spans exactly twelve hours", () => {
    for (const at of [
      "2026-01-01T00:00:00Z",
      "2026-02-28T23:59:59Z",
      "2026-06-15T12:00:00Z",
      "2026-12-31T18:30:00Z",
    ]) {
      const shift = currentShift(new Date(at));
      const spanMs =
        new Date(shift.ends_at).getTime() - new Date(shift.starts_at).getTime();

      expect(spanMs).toBe(12 * 60 * 60 * 1000);
    }
  });

  it("brackets the instant it was asked about", () => {
    const at = new Date("2026-03-09T17:59:59Z");
    const shift = currentShift(at);

    expect(new Date(shift.starts_at).getTime()).toBeLessThanOrEqual(
      at.getTime()
    );
    expect(new Date(shift.ends_at).getTime()).toBeGreaterThan(at.getTime());
  });

  it("spells the offset as +00:00, never Z", () => {
    const shift = currentShift(new Date("2026-07-30T09:00:00Z"));

    expect(shift.starts_at).toContain("+00:00");
    expect(shift.starts_at).not.toContain("Z");
  });

  /**
   * **The defect this file used to pin.** The banner renders `starts_at` through
   * `formatPlantTime`, so the only assertion that matters to a reader is what
   * the clock on the wall says — FR-HOME-03's "06:00", not "10:00".
   */
  it("renders as 06:00–18:00 on a plant-time clock", () => {
    const plantTime = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Muscat",
    });
    const shift = currentShift(new Date("2026-07-30T09:58:47Z"));

    expect(plantTime.format(new Date(shift.starts_at))).toBe("06:00");
    expect(plantTime.format(new Date(shift.ends_at))).toBe("18:00");
  });
});

/**
 * **FR-HOME-03** — "shift boundaries configurable. The Administrator can change
 * shift timings, and report/summary generation aligns to them." Before Phase 3b
 * the stored configuration was written and then ignored.
 */
describe("currentShift with a configured boundary", () => {
  const config = (
    overrides: Partial<ShiftConfigWire> = {}
  ): ShiftConfigWire => ({
    day_start: "07:00",
    day_end: "19:00",
    night_start: "19:00",
    night_end: "07:00",
    overlap_minutes: 30,
    ...overrides,
  });

  it("moves the boundary to the configured start hour", () => {
    // 12:00 GST — inside the day shift under either configuration.
    const shift = currentShift(new Date("2026-07-30T08:00:00Z"), config());

    expect(shift.label).toBe("Day");
    // 07:00 GST = 03:00 UTC.
    expect(shift.starts_at).toBe("2026-07-30T03:00:00.000+00:00");
    expect(shift.ends_at).toBe("2026-07-30T15:00:00.000+00:00");
  });

  /**
   * The hour that changes answer: 06:30 GST is the *day* shift on the seeded
   * 06:00 boundary and still the *previous night's* on a 07:00 one. If the
   * configuration were being ignored this test would return "Day".
   */
  it("puts 06:30 in the night shift once the day starts at 07:00", () => {
    const at = new Date("2026-07-30T02:30:00Z");

    expect(currentShift(at).label).toBe("Day");
    expect(currentShift(at, config()).label).toBe("Night");
    expect(currentShift(at, config()).shift_id).toBe("20260729-N");
  });

  it("reports the configured handover overlap", () => {
    expect(currentShift(new Date(), config()).overlap_minutes).toBe(30);
    expect(
      currentShift(new Date(), config({ overlap_minutes: 0 })).overlap_minutes
    ).toBe(0);
  });

  it("honours a half-hour boundary, not just whole hours", () => {
    const shift = currentShift(
      new Date("2026-07-30T09:00:00Z"),
      config({ day_start: "06:30" })
    );

    expect(shift.starts_at).toBe("2026-07-30T02:30:00.000+00:00");
  });

  /**
   * Fails safe rather than producing an `Invalid Date`. `shiftConfigWireSchema`
   * validates on the way in, so this is defence against a store somebody edited
   * by hand — the value falls back to the seeded default instead of poisoning
   * every timestamp downstream.
   */
  it("falls back to the default start on an unparseable time", () => {
    const shift = currentShift(
      new Date("2026-07-30T09:58:47Z"),
      config({ day_start: "nonsense" })
    );

    expect(shift.starts_at).toBe("2026-07-30T02:00:00.000+00:00");
  });
});
