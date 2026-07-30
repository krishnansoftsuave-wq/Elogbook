import { describe, expect, it } from "vitest";

import { currentShift } from "@/mocks/shifts/current";

/**
 * The arithmetic, not the plumbing — `routes.test.ts` covers the handler.
 *
 * Every case pins an explicit UTC instant, because the one thing that can
 * actually be wrong here is a boundary: §7's model puts the day shift at
 * 06:00–18:00, which means a pre-dawn timestamp belongs to the *previous*
 * calendar day's night shift.
 */
describe("currentShift", () => {
  it("returns §7's worked example at midday", () => {
    expect(currentShift(new Date("2026-07-30T09:58:47Z"))).toEqual({
      shift_id: "20260730-D",
      label: "Day",
      starts_at: "2026-07-30T06:00:00.000+00:00",
      ends_at: "2026-07-30T18:00:00.000+00:00",
      overlap_minutes: 15,
    });
  });

  it("opens the day shift exactly at 06:00", () => {
    const shift = currentShift(new Date("2026-07-30T06:00:00Z"));

    expect(shift.label).toBe("Day");
    expect(shift.starts_at).toBe("2026-07-30T06:00:00.000+00:00");
  });

  it("hands over to night exactly at 18:00", () => {
    const shift = currentShift(new Date("2026-07-30T18:00:00Z"));

    expect(shift.shift_id).toBe("20260730-N");
    expect(shift.label).toBe("Night");
    expect(shift.starts_at).toBe("2026-07-30T18:00:00.000+00:00");
    expect(shift.ends_at).toBe("2026-07-31T06:00:00.000+00:00");
  });

  it("still reports the previous day's night shift at 05:59", () => {
    // The case a naive `getUTCDate()` gets wrong: 02:00 on the 30th is worked
    // by the shift that opened at 18:00 on the 29th.
    const shift = currentShift(new Date("2026-07-30T05:59:59Z"));

    expect(shift.shift_id).toBe("20260729-N");
    expect(shift.label).toBe("Night");
    expect(shift.starts_at).toBe("2026-07-29T18:00:00.000+00:00");
    expect(shift.ends_at).toBe("2026-07-30T06:00:00.000+00:00");
  });

  it("crosses a month boundary without renaming the shift", () => {
    const shift = currentShift(new Date("2026-08-01T03:00:00Z"));

    expect(shift.shift_id).toBe("20260731-N");
    expect(shift.starts_at).toBe("2026-07-31T18:00:00.000+00:00");
    expect(shift.ends_at).toBe("2026-08-01T06:00:00.000+00:00");
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
});
