import { describe, expect, it } from "vitest";

import { ROLES } from "@/constants/roles";
import {
  groupSubtitle,
  hasSubCategories,
  modulesFor,
  ROLE_GROUP_ORDER,
  ROLE_SUB_CATEGORIES,
  SUB_CATEGORY,
  subCategoryOnSwitch,
  variantFor,
} from "@/constants/subCategories";

describe("role variants", () => {
  /**
   * Twelve is the prototype's count (`MAIN_ROLES`, `app-source.txt` 18–33) and
   * it must fall out of the data rather than be asserted anywhere in the code —
   * a role gaining a sub-category should change it.
   */
  it("produces the prototype's twelve variants from five roles", () => {
    const total = ROLE_GROUP_ORDER.reduce(
      (count, role) => count + ROLE_SUB_CATEGORIES[role].length,
      0
    );

    expect(total).toBe(12);
  });

  it("gives Management no shutdown sub-category, as §6.3 does not list one", () => {
    expect(ROLE_SUB_CATEGORIES[ROLES.MANAGEMENT]).not.toContain(
      SUB_CATEGORY.SHUTDOWN
    );
    expect(ROLE_SUB_CATEGORIES[ROLES.SUPERVISOR]).toContain(
      SUB_CATEGORY.SHUTDOWN
    );
  });

  it("labels each variant with the MAIN_ROLES wording, en dash included", () => {
    expect(variantFor(ROLES.MANAGEMENT, SUB_CATEGORY.PROCESS).label).toBe(
      "Superintendent – Process (All Trains)"
    );
    expect(variantFor(ROLES.SUPERVISOR, SUB_CATEGORY.UTILITY).label).toBe(
      "Utility Supervisor"
    );
    // Per-variant initials come from the ROLES table, not MAIN_ROLES.
    expect(variantFor(ROLES.SUPERVISOR, SUB_CATEGORY.SHUTDOWN).initials).toBe(
      "SD"
    );
  });

  it("has no dropdown for a role with a single sub-category", () => {
    expect(hasSubCategories(ROLES.OPERATOR)).toBe(false);
    expect(hasSubCategories(ROLES.ADMINISTRATOR)).toBe(false);
    expect(hasSubCategories(ROLES.SUPER_USER)).toBe(false);
    expect(hasSubCategories(ROLES.SUPERVISOR)).toBe(true);
    expect(hasSubCategories(ROLES.MANAGEMENT)).toBe(true);
  });
});

/**
 * Line 263: `m.types.find(t => t.role === cur) || m.types[0]`. Switching group
 * keeps the sub-type where the target offers it, and falls back to that group's
 * first otherwise.
 */
describe("sub-type preservation on a group switch", () => {
  it("keeps the sub-type when the target role offers it", () => {
    expect(subCategoryOnSwitch(ROLES.MANAGEMENT, SUB_CATEGORY.UTILITY)).toBe(
      SUB_CATEGORY.UTILITY
    );
  });

  it("falls back to the target's first when it does not", () => {
    // Management has no shutdown, so a Shutdown Supervisor becomes whole-plant.
    expect(subCategoryOnSwitch(ROLES.MANAGEMENT, SUB_CATEGORY.SHUTDOWN)).toBe(
      SUB_CATEGORY.WHOLE_PLANT
    );

    // Operator offers nothing but whole-plant.
    expect(subCategoryOnSwitch(ROLES.OPERATOR, SUB_CATEGORY.PROCESS)).toBe(
      SUB_CATEGORY.WHOLE_PLANT
    );
  });

  it("keeps you where you are when you re-pick your own group", () => {
    // Clicking "Supervisor" as a Utility Supervisor must not reset the sub-type.
    expect(subCategoryOnSwitch(ROLES.SUPERVISOR, SUB_CATEGORY.UTILITY)).toBe(
      SUB_CATEGORY.UTILITY
    );
  });
});

/**
 * Line 271: `m.types ? m.types.length + ' types' : ROLES[m.role].nav.length + ' modules'`.
 * These five strings are the ones the prototype screenshot shows.
 */
describe("the switcher's derived subtitle", () => {
  it("counts sub-types for a grouped role and modules otherwise", () => {
    expect(groupSubtitle(ROLES.OPERATOR)).toBe("5 modules");
    expect(groupSubtitle(ROLES.SUPERVISOR)).toBe("5 types");
    expect(groupSubtitle(ROLES.MANAGEMENT)).toBe("4 types");
    /*
      Seven, not the prototype's six: `dashboards` was added to the
      Administrator's module set because **FR-ADM-07** gives them widget
      configuration and the route already admits them on the wildcard — without
      it the sidebar's second, module-based filter dropped the row and
      `/dashboards` had no link anywhere in the shell. The subtitle is derived
      from that set, so the count moves with it.
    */
    expect(groupSubtitle(ROLES.ADMINISTRATOR)).toBe("7 modules");
    expect(groupSubtitle(ROLES.SUPER_USER)).toBe("5 modules");
  });
});

/**
 * `navItems()`, lines 282–288 — the toggle is not decorative. With the decision
 * workflow on, a **management** role gains "Decision Workflow" immediately after
 * Dashboard, and no other role does (§6.3(b)).
 */
describe("the decision-workflow nav splice", () => {
  it("inserts decisions after dashboard for management when enabled", () => {
    const modules = modulesFor(ROLES.MANAGEMENT, true);

    expect(modules[0]).toBe("dashboard");
    expect(modules[1]).toBe("decisions");
    expect(modules).toHaveLength(
      modulesFor(ROLES.MANAGEMENT, false).length + 1
    );
  });

  it("leaves management alone when the workflow is off", () => {
    expect(modulesFor(ROLES.MANAGEMENT, false)).not.toContain("decisions");
  });

  it("never splices for a role that is not management", () => {
    for (const role of ROLE_GROUP_ORDER) {
      if (role === ROLES.MANAGEMENT) continue;
      expect(modulesFor(role, true)).not.toContain("decisions");
    }
  });
});
