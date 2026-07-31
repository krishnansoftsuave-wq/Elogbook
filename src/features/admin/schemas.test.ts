import { describe, expect, it } from "vitest";

import {
  NOTIFICATION_PERMISSION_KEYS,
  WORKFLOW_KEYS,
  deriveShiftConfig,
  notificationPermissionWireSchema,
  shiftConfigWireSchema,
  shiftTimingsFormSchema,
  toNotificationPermission,
  toShiftConfig,
  toWorkflow,
  workflowWireSchema,
} from "@/features/admin/schemas";

describe("workflow toggles", () => {
  it("names the four switches the Administrator screen exposes", () => {
    expect(WORKFLOW_KEYS).toEqual([
      "operator_comment_permission",
      "supervisor_action_workflow",
      "management_decision_workflow",
      "predictive_insights",
    ]);
  });

  it("maps affects_role", () => {
    const workflow = toWorkflow(
      workflowWireSchema.parse({
        key: "supervisor_action_workflow",
        enabled: false,
        affects_role: "supervisor",
      })
    );

    expect(workflow.affectsRole).toBe("supervisor");
  });

  it("rejects a role outside the five the platform resolves", () => {
    expect(() =>
      workflowWireSchema.parse({
        key: "supervisor_action_workflow",
        enabled: false,
        affects_role: "shutdown_supervisor",
      })
    ).toThrow();
  });
});

describe("shift config — FR-HOME-03", () => {
  const CONFIG = {
    day_start: "06:00",
    day_end: "18:00",
    night_start: "18:00",
    night_end: "06:00",
    overlap_minutes: 15,
  } as const;

  it("accepts 24-hour HH:MM boundaries", () => {
    expect(() => shiftConfigWireSchema.parse(CONFIG)).not.toThrow();
  });

  it.each(["6:00", "24:00", "06:60", "6am", "06.00"])(
    "rejects %s as a shift boundary",
    (value) => {
      expect(() =>
        shiftConfigWireSchema.parse({ ...CONFIG, day_start: value })
      ).toThrow();
    }
  );

  it("maps to camelCase", () => {
    const config = toShiftConfig(shiftConfigWireSchema.parse(CONFIG));
    expect(config.dayStart).toBe("06:00");
    expect(config.overlapMinutes).toBe(15);
  });
});

/**
 * **Two fields are editable; the other three follow.** FR-HOME-03 defines a
 * shift as "a 12-hour period", so once the day shift's start is known its end
 * and both night boundaries are arithmetic. The prototype draws four
 * independently editable inputs — the named deviation.
 */
describe("deriveShiftConfig — FR-HOME-03", () => {
  it("puts the night boundary twelve hours after the day's", () => {
    expect(
      deriveShiftConfig({ dayStart: "06:00", overlapMinutes: 15 })
    ).toEqual({
      day_start: "06:00",
      day_end: "18:00",
      night_start: "18:00",
      night_end: "06:00",
      overlap_minutes: 15,
    });
  });

  it("wraps past midnight rather than producing a 26th hour", () => {
    expect(deriveShiftConfig({ dayStart: "19:30", overlapMinutes: 0 })).toEqual(
      {
        day_start: "19:30",
        day_end: "07:30",
        night_start: "07:30",
        night_end: "19:30",
        overlap_minutes: 0,
      }
    );
  });

  it("keeps the day's end and the night's start the same instant", () => {
    // Two names for one boundary — a gap or an overlap between them would be a
    // shape FR-HOME-03's "12-hour period" does not describe.
    for (const dayStart of ["00:00", "06:00", "13:45", "23:59"]) {
      const config = deriveShiftConfig({ dayStart, overlapMinutes: 15 });
      expect(config.day_end).toBe(config.night_start);
      expect(config.night_end).toBe(config.day_start);
    }
  });

  it("produces a value the wire schema accepts", () => {
    expect(() =>
      shiftConfigWireSchema.parse(
        deriveShiftConfig({ dayStart: "07:00", overlapMinutes: 30 })
      )
    ).not.toThrow();
  });
});

describe("shiftTimingsFormSchema", () => {
  it("accepts the seeded boundary", () => {
    expect(
      shiftTimingsFormSchema.safeParse({
        dayStart: "06:00",
        overlapMinutes: 15,
      }).success
    ).toBe(true);
  });

  it("rejects a clock time that is not 24-hour HH:MM", () => {
    expect(
      shiftTimingsFormSchema.safeParse({ dayStart: "6am", overlapMinutes: 15 })
        .success
    ).toBe(false);
  });

  it("rejects a negative or fractional overlap", () => {
    expect(
      shiftTimingsFormSchema.safeParse({
        dayStart: "06:00",
        overlapMinutes: -1,
      }).success
    ).toBe(false);
    expect(
      shiftTimingsFormSchema.safeParse({
        dayStart: "06:00",
        overlapMinutes: 7.5,
      }).success
    ).toBe(false);
  });

  /**
   * The bound is derived, not invented: a handover cannot be longer than the
   * shift it hands over, and FR-HOME-03 fixes the shift at twelve hours.
   */
  it("rejects an overlap longer than the shift", () => {
    expect(
      shiftTimingsFormSchema.safeParse({
        dayStart: "06:00",
        overlapMinutes: 720,
      }).success
    ).toBe(true);
    expect(
      shiftTimingsFormSchema.safeParse({
        dayStart: "06:00",
        overlapMinutes: 721,
      }).success
    ).toBe(false);
  });
});

describe("notification permissions — FR-NOT-01", () => {
  const ROW = {
    username: "said.albusaidi",
    display_name: "Said Al-Busaidi",
    role_label: "Operator",
    permissions: {
      action_assigned: { in_app: true, email: false },
      action_overdue: { in_app: true, email: false },
      summary_ready: { in_app: false, email: false },
      report_ready: { in_app: false, email: false },
    },
  } as const;

  it("covers the four FR-NOT-01 notification types", () => {
    expect(NOTIFICATION_PERMISSION_KEYS).toEqual([
      "action_assigned",
      "action_overdue",
      "summary_ready",
      "report_ready",
    ]);
  });

  /**
   * The prototype stores each cell as a positional `[boolean, boolean]` tuple
   * and keys the whole matrix by display name. Both are corrected here: a tuple
   * gets read backwards eventually, and this decides who is told about an
   * overdue safety action.
   */
  it("names the two channels rather than positioning them", () => {
    const row = toNotificationPermission(
      notificationPermissionWireSchema.parse(ROW)
    );

    expect(row.permissions.action_assigned.in_app).toBe(true);
    expect(row.permissions.action_assigned.email).toBe(false);
  });

  it("rejects the prototype's tuple form outright", () => {
    expect(() =>
      notificationPermissionWireSchema.parse({
        ...ROW,
        permissions: {
          action_assigned: [true, false],
          action_overdue: [true, false],
          summary_ready: [false, false],
          report_ready: [false, false],
        },
      })
    ).toThrow();
  });

  it("requires every notification type to be present", () => {
    expect(() =>
      notificationPermissionWireSchema.parse({
        ...ROW,
        permissions: { action_assigned: { in_app: true, email: false } },
      })
    ).toThrow();
  });

  it("is keyed by username, not display name", () => {
    const row = toNotificationPermission(
      notificationPermissionWireSchema.parse(ROW)
    );
    expect(row.username).toBe("said.albusaidi");
    expect(row.displayName).toBe("Said Al-Busaidi");
  });
});
