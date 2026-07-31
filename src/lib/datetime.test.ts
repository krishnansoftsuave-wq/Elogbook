import { describe, expect, it } from "vitest";

import {
  PLANT_TIME_ZONE_LABEL,
  formatPlantDateTime,
  formatPlantTime,
  formatShiftDate,
} from "@/lib/datetime";

describe("formatShiftDate", () => {
  it("renders a YYYYMMDD shift date", () => {
    expect(formatShiftDate("20250610")).toBe("10 Jun 2025");
    expect(formatShiftDate("20260101")).toBe("01 Jan 2026");
    expect(formatShiftDate("20261231")).toBe("31 Dec 2026");
  });

  /**
   * The reason the date is assembled at UTC noon rather than midnight. A
   * calendar date built at 00:00 UTC and then rendered in a zone ahead of or
   * behind UTC can land on the previous or next day; noon has twelve hours of
   * slack in both directions, which no real zone offset exceeds.
   */
  it("does not slip a day when rendered in plant time", () => {
    // Asia/Muscat is UTC+4, so a midnight-anchored date would still be correct
    // here — but a midnight-anchored date in any behind-UTC zone would not, and
    // this pins the technique rather than the one lucky case.
    expect(formatShiftDate("20260301")).toBe("01 Mar 2026");
    expect(formatShiftDate("20260228")).toBe("28 Feb 2026");
  });

  /**
   * A malformed value comes back unchanged. A raw `2025-06-10` in a table cell
   * is a legible symptom; "Invalid Date" or an empty cell is not.
   */
  it("returns anything that is not eight digits untouched", () => {
    expect(formatShiftDate("2025-06-10")).toBe("2025-06-10");
    expect(formatShiftDate("")).toBe("");
    expect(formatShiftDate("nonsense")).toBe("nonsense");
    expect(formatShiftDate("202506100")).toBe("202506100");
  });
});

describe("formatPlantTime", () => {
  /**
   * The zone is fixed to GST rather than the viewer's, because FR-HOME-03's
   * 06:00–18:00 shift boundaries are plant-local. A summary generated at
   * 18:05 GST must read 18:05 next to a window labelled "Day (06:00–18:00)"
   * regardless of where it is being read.
   */
  it("renders in plant time, not the runner's zone", () => {
    // 14:05 UTC is 18:05 in Asia/Muscat (UTC+4).
    expect(formatPlantTime("2026-06-10T14:05:00+00:00")).toBe(
      `18:05 ${PLANT_TIME_ZONE_LABEL}`
    );
  });

  it("honours the offset in the input rather than assuming UTC", () => {
    // The same instant, spelled with a +04:00 offset.
    expect(formatPlantTime("2026-06-10T18:05:00+04:00")).toBe(
      `18:05 ${PLANT_TIME_ZONE_LABEL}`
    );
  });

  it("returns an empty string for an unparseable instant", () => {
    expect(formatPlantTime("")).toBe("");
    expect(formatPlantTime("not a date")).toBe("");
  });
});

describe("formatPlantDateTime", () => {
  it("renders day, month and time in plant time", () => {
    expect(formatPlantDateTime("2026-06-10T10:45:00+00:00")).toBe(
      "10 Jun, 14:45"
    );
  });

  it("rolls into the next plant day when the offset carries it there", () => {
    // 21:30 UTC is 01:30 the following day in Asia/Muscat.
    expect(formatPlantDateTime("2026-06-10T21:30:00+00:00")).toBe(
      "11 Jun, 01:30"
    );
  });

  it("returns an empty string for an unparseable instant", () => {
    expect(formatPlantDateTime("nope")).toBe("");
  });
});
