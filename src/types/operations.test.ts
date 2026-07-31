import { describe, expect, it } from "vitest";

import {
  ACTION_STATUS_LABEL,
  ACTION_STATUS_VALUES,
  PRIORITY_LABEL,
  PRIORITY_VALUES,
  isActionOverdue,
  isClosedStatus,
} from "@/types/operations";

const AT = new Date("2026-07-31T12:00:00.000Z");
const YESTERDAY = "2026-07-30T12:00:00+00:00";
const TOMORROW = "2026-08-01T12:00:00+00:00";

describe("action status vocabulary", () => {
  /**
   * FR-PA-04 names six states in order. The prototype ships five and includes
   * `Overdue`, so this is the assertion that would fail if someone ported the
   * prototype's set back in.
   */
  it("is FR-PA-04's six states, in the requirement's order", () => {
    expect(ACTION_STATUS_VALUES).toEqual([
      "open",
      "in_progress",
      "on_hold",
      "completed",
      "cancelled",
      "verified",
    ]);
  });

  it("has no 'overdue' state — FR-PA-06 makes it a derived flag", () => {
    expect(ACTION_STATUS_VALUES).not.toContain("overdue");
  });

  it("labels every state", () => {
    for (const status of ACTION_STATUS_VALUES) {
      expect(ACTION_STATUS_LABEL[status]).toBeTruthy();
    }
  });

  it("labels every priority", () => {
    for (const priority of PRIORITY_VALUES) {
      expect(PRIORITY_LABEL[priority]).toBeTruthy();
    }
  });
});

describe("isClosedStatus", () => {
  it("treats completed, cancelled and verified as out of play", () => {
    expect(isClosedStatus("completed")).toBe(true);
    expect(isClosedStatus("cancelled")).toBe(true);
    expect(isClosedStatus("verified")).toBe(true);
  });

  it("treats open, in progress and on hold as live", () => {
    expect(isClosedStatus("open")).toBe(false);
    expect(isClosedStatus("in_progress")).toBe(false);
    expect(isClosedStatus("on_hold")).toBe(false);
  });
});

describe("isActionOverdue — FR-PA-06", () => {
  it("flags a live action whose due date has passed", () => {
    expect(isActionOverdue(YESTERDAY, "open", AT)).toBe(true);
    expect(isActionOverdue(YESTERDAY, "in_progress", AT)).toBe(true);
    expect(isActionOverdue(YESTERDAY, "on_hold", AT)).toBe(true);
  });

  it("does not flag an action that is not yet due", () => {
    expect(isActionOverdue(TOMORROW, "open", AT)).toBe(false);
  });

  /**
   * The reason overdue is derived rather than stored: a completed action whose
   * due date is in the past is *done*, not late. Modelling `Overdue` as a status
   * — as the prototype does — makes this case unrepresentable.
   */
  it("never flags a closed action, however old its due date", () => {
    expect(isActionOverdue(YESTERDAY, "completed", AT)).toBe(false);
    expect(isActionOverdue(YESTERDAY, "cancelled", AT)).toBe(false);
    expect(isActionOverdue(YESTERDAY, "verified", AT)).toBe(false);
  });

  it("is exclusive at the boundary — due exactly now is not yet late", () => {
    expect(isActionOverdue("2026-07-31T12:00:00+00:00", "open", AT)).toBe(
      false
    );
  });

  /**
   * FR-AN-06 leaves counting definitions unconfirmed and the prototype itself
   * carries a "No due date — unparsed, needs review" bucket, so an unparseable
   * date must not be silently counted as late.
   */
  it("does not treat an unparseable due date as evidence of lateness", () => {
    expect(isActionOverdue("", "open", AT)).toBe(false);
    expect(isActionOverdue("not a date", "open", AT)).toBe(false);
  });

  /**
   * The regression this guards is subtle and was found by this test failing.
   * `Date.parse` accepts implementation-specific formats: V8 reads the
   * prototype's own `'14 Jun 16:00'` as June 14th *of the current year*, which
   * lands in the past for half of every year. Left to `Date.parse`, porting a
   * prototype date string would flag a live critical action as overdue with
   * nothing in the data to explain it.
   */
  it("rejects the prototype's own date format rather than guessing a year", () => {
    expect(isActionOverdue("14 Jun 16:00", "open", AT)).toBe(false);
    expect(isActionOverdue("10 Jun 18:00", "open", AT)).toBe(false);
  });

  it("accepts ISO-8601 with either an offset or Z", () => {
    expect(isActionOverdue("2026-07-30T12:00:00+00:00", "open", AT)).toBe(true);
    expect(isActionOverdue("2026-07-30T12:00:00Z", "open", AT)).toBe(true);
    expect(isActionOverdue("2026-07-30T12:00+04:00", "open", AT)).toBe(true);
  });
});
