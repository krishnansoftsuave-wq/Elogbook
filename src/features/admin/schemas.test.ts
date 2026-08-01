import { describe, expect, it } from "vitest";

import {
  EMPTY_MODULE_PERMISSIONS,
  NOTIFICATION_PERMISSION_KEYS,
  WORKFLOW_KEYS,
  notificationPermissionWireSchema,
  roleFormSchema,
  roleWireSchema,
  shiftConfigWireSchema,
  shiftTimingsFormSchema,
  toAdminRole,
  toNotificationPermission,
  toRoleWriteWire,
  toShiftConfig,
  toShiftConfigWire,
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

describe("toShiftConfigWire", () => {
  it("maps camelCase form values straight to the snake_case wire shape", () => {
    expect(
      toShiftConfigWire({
        dayStart: "06:00",
        dayEnd: "18:00",
        nightStart: "18:00",
        nightEnd: "06:00",
        overlapMinutes: 15,
      })
    ).toEqual({
      day_start: "06:00",
      day_end: "18:00",
      night_start: "18:00",
      night_end: "06:00",
      overlap_minutes: 15,
    });
  });

  it("produces a value the wire schema accepts", () => {
    expect(() =>
      shiftConfigWireSchema.parse(
        toShiftConfigWire({
          dayStart: "07:00",
          dayEnd: "19:00",
          nightStart: "19:00",
          nightEnd: "07:00",
          overlapMinutes: 30,
        })
      )
    ).not.toThrow();
  });
});

/**
 * **All four boundaries are independently editable**, matching the
 * prototype's literal layout. FR-HOME-03 still fixes a shift at twelve
 * hours, so that shape is enforced by these refinements at submit time
 * rather than by deriving the fields from one another.
 */
describe("shiftTimingsFormSchema — FR-HOME-03", () => {
  const VALID = {
    dayStart: "06:00",
    dayEnd: "18:00",
    nightStart: "18:00",
    nightEnd: "06:00",
    overlapMinutes: 15,
  };

  it("accepts a valid twelve-hour split", () => {
    expect(shiftTimingsFormSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts a split that wraps past midnight", () => {
    expect(
      shiftTimingsFormSchema.safeParse({
        dayStart: "19:30",
        dayEnd: "07:30",
        nightStart: "07:30",
        nightEnd: "19:30",
        overlapMinutes: 0,
      }).success
    ).toBe(true);
  });

  it("rejects a clock time that is not 24-hour HH:MM", () => {
    expect(
      shiftTimingsFormSchema.safeParse({ ...VALID, dayStart: "6am" }).success
    ).toBe(false);
  });

  it("rejects a day shift that is not exactly twelve hours", () => {
    expect(
      shiftTimingsFormSchema.safeParse({ ...VALID, dayEnd: "14:00" }).success
    ).toBe(false);
  });

  it("rejects a night shift that does not start where the day shift ends", () => {
    expect(
      shiftTimingsFormSchema.safeParse({ ...VALID, nightStart: "20:00" })
        .success
    ).toBe(false);
  });

  it("rejects a night shift that is not exactly twelve hours", () => {
    expect(
      shiftTimingsFormSchema.safeParse({ ...VALID, nightEnd: "04:00" }).success
    ).toBe(false);
  });

  it("rejects a day shift that does not start where the night shift ends", () => {
    expect(
      shiftTimingsFormSchema.safeParse({
        ...VALID,
        dayStart: "05:00",
        nightEnd: "06:00",
      }).success
    ).toBe(false);
  });

  it("rejects a negative or fractional overlap", () => {
    expect(
      shiftTimingsFormSchema.safeParse({ ...VALID, overlapMinutes: -1 }).success
    ).toBe(false);
    expect(
      shiftTimingsFormSchema.safeParse({ ...VALID, overlapMinutes: 7.5 })
        .success
    ).toBe(false);
  });

  /**
   * The bound is derived, not invented: a handover cannot be longer than the
   * shift it hands over, and FR-HOME-03 fixes the shift at twelve hours.
   */
  it("rejects an overlap longer than the shift", () => {
    expect(
      shiftTimingsFormSchema.safeParse({ ...VALID, overlapMinutes: 720 })
        .success
    ).toBe(true);
    expect(
      shiftTimingsFormSchema.safeParse({ ...VALID, overlapMinutes: 721 })
        .success
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

describe("roles — §6 / FR-ADM-02", () => {
  const ROLE = {
    id: "ROLE-0007",
    name: "Shutdown Coordinator",
    member_count: 1,
    ad_group: "ELOGBOOK_SHUTDOWN",
    type: "custom",
    permissions: EMPTY_MODULE_PERMISSIONS,
    data_scope: "full_plant",
  } as const;

  it("maps to camelCase", () => {
    const role = toAdminRole(roleWireSchema.parse(ROLE));

    expect(role.memberCount).toBe(1);
    expect(role.adGroup).toBe("ELOGBOOK_SHUTDOWN");
    expect(role.type).toBe("custom");
    expect(role.dataScope).toBe("full_plant");
  });

  it("rejects a type outside base/custom", () => {
    expect(() => roleWireSchema.parse({ ...ROLE, type: "system" })).toThrow();
  });

  it("rejects a negative member count", () => {
    expect(() => roleWireSchema.parse({ ...ROLE, member_count: -1 })).toThrow();
  });

  it("rejects a data scope outside full_plant/area_restricted", () => {
    expect(() =>
      roleWireSchema.parse({ ...ROLE, data_scope: "site_wide" })
    ).toThrow();
  });

  it("requires all four permission actions per module", () => {
    expect(() =>
      roleWireSchema.parse({
        ...ROLE,
        permissions: { ...EMPTY_MODULE_PERMISSIONS, assistant: { view: true } },
      })
    ).toThrow();
  });
});

/**
 * §9.1 — "specific module permissions (View, Generate, Approve, Export),
 * data scope (Full Plant or Area-Restricted), and AD-group mapping."
 */
describe("roleFormSchema — §9.1 / FR-ADM-02", () => {
  const VALUES = {
    name: "Shutdown Coordinator",
    permissions: EMPTY_MODULE_PERMISSIONS,
    dataScope: "full_plant",
    adGroup: "ELOGBOOK_SHUTDOWN",
  } as const;

  it("accepts a complete submission", () => {
    expect(roleFormSchema.safeParse(VALUES).success).toBe(true);
  });

  it("rejects a name under two characters", () => {
    expect(roleFormSchema.safeParse({ ...VALUES, name: "A" }).success).toBe(
      false
    );
  });

  it("rejects an empty AD group", () => {
    expect(roleFormSchema.safeParse({ ...VALUES, adGroup: "" }).success).toBe(
      false
    );
  });

  it("trims the role name", () => {
    const parsed = roleFormSchema.parse({ ...VALUES, name: "  Shutdown  " });
    expect(parsed.name).toBe("Shutdown");
  });

  it("maps camelCase form values to the snake_case wire shape", () => {
    const wire = toRoleWriteWire(VALUES);

    expect(wire.data_scope).toBe("full_plant");
    expect(wire.ad_group).toBe("ELOGBOOK_SHUTDOWN");
    expect(wire.permissions).toEqual(EMPTY_MODULE_PERMISSIONS);
  });
});
