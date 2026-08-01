import { ROLES, type Role } from "@/constants/roles";

/**
 * Sub-categories — the second half of the identity the prototype calls a "role
 * variant", and the reason this build needs twelve of them without twelve role
 * constants.
 *
 * ## Why (role × sub-category) and not twelve roles
 *
 * The BRD models it this way itself. **§6.2**: "Four sub-categories, **each
 * inheriting Supervisor permissions**; the Administrator sets data scope (area,
 * unit or train) per sub-category: Shutdown Supervisor (if applicable) · Process
 * · Utility · Storage & Loading." **§6.3** says the same for Management's three,
 * and **§4** shows both "as a **dropdown**". A sub-category is therefore not a
 * role: it inherits the parent's permissions entirely and carries only a data
 * scope. Twelve flat role constants would break `AD_GROUP_TO_ROLE`, the tested
 * permission table, and §6's custom roles for no gain.
 *
 * The counts fall out rather than being asserted: Supervisor has a base plus
 * §6.2's four, Management a base plus §6.3's three — 5 and 4, exactly the
 * prototype's `MAIN_ROLES` (`app-source.txt` 18–33). Management has **no**
 * shutdown sub-category, which is also the BRD's own list.
 *
 * ## This is NOT `session.areaScope`
 *
 * `meDataSchema.area_scope` (`string[] | null`) already exists and means
 * something different: the **Admin-issued data entitlement**, §6.2's "area, unit
 * or train". A sub-category is *which dropdown entry you are*; the entitlement
 * is what the Administrator then grants it. They are deliberately separate names
 * so that neither is mistaken for the other — and in particular so nothing here
 * is ever fed to the assistant, which **FR-AI-04** forbids: "Do not restrict
 * answers by area; all operational users may query all units."
 */
export const SUB_CATEGORY = {
  WHOLE_PLANT: "whole_plant",
  SHUTDOWN: "shutdown",
  PROCESS: "process",
  UTILITY: "utility",
  STORAGE_LOADING: "storage_loading",
} as const;

export type SubCategory = (typeof SUB_CATEGORY)[keyof typeof SUB_CATEGORY];

/**
 * Which sub-categories each role offers, in the prototype's own order. A role
 * with a single entry has no dropdown at all — `app-source.txt` 229 returns
 * `null` rather than rendering a disabled control, and so does `SubTypePill`.
 */
export const ROLE_SUB_CATEGORIES: Record<Role, readonly SubCategory[]> = {
  [ROLES.OPERATOR]: [SUB_CATEGORY.WHOLE_PLANT],
  [ROLES.SUPERVISOR]: [
    SUB_CATEGORY.WHOLE_PLANT,
    SUB_CATEGORY.SHUTDOWN,
    SUB_CATEGORY.PROCESS,
    SUB_CATEGORY.UTILITY,
    SUB_CATEGORY.STORAGE_LOADING,
  ],
  // No shutdown: §6.3 lists three sub-categories and shutdown is not one.
  [ROLES.MANAGEMENT]: [
    SUB_CATEGORY.WHOLE_PLANT,
    SUB_CATEGORY.PROCESS,
    SUB_CATEGORY.UTILITY,
    SUB_CATEGORY.STORAGE_LOADING,
  ],
  [ROLES.ADMINISTRATOR]: [SUB_CATEGORY.WHOLE_PLANT],
  [ROLES.SUPER_USER]: [SUB_CATEGORY.WHOLE_PLANT],
};

/** True when the role offers a sub-type dropdown — `M.types` at line 229. */
export const hasSubCategories = (role: Role): boolean =>
  ROLE_SUB_CATEGORIES[role].length > 1;

/**
 * The group heading and avatar initials — the prototype's `MAIN_ROLES` `main`
 * and `initials` (18–33).
 *
 * ⚠️ `main` is not always the role's own label. `MAIN_ROLES` calls the
 * administrator group **"Administration"** while `ROLES.admin.label` is
 * "Administrator", and it calls the management group **"Superintendent"** while
 * this build's `ROLE_LABEL` says "Management". Both divergences are the
 * prototype's, transcribed rather than reconciled.
 */
export const ROLE_GROUP: Record<Role, { label: string; initials: string }> = {
  [ROLES.OPERATOR]: { label: "Operator", initials: "OP" },
  [ROLES.SUPERVISOR]: { label: "Supervisor", initials: "SV" },
  [ROLES.MANAGEMENT]: { label: "Superintendent", initials: "SI" },
  [ROLES.ADMINISTRATOR]: { label: "Administration", initials: "AD" },
  [ROLES.SUPER_USER]: { label: "Super User", initials: "SU" },
};

/** The order the switcher lists the groups in — `MAIN_ROLES` 18–33. */
export const ROLE_GROUP_ORDER: readonly Role[] = [
  ROLES.OPERATOR,
  ROLES.SUPERVISOR,
  ROLES.MANAGEMENT,
  ROLES.ADMINISTRATOR,
  ROLES.SUPER_USER,
];

interface RoleVariant {
  /**
   * From `MAIN_ROLES` (18–33), **not** the `ROLES` table (5–17). The two
   * disagree on five of the twelve — `ROLES.superintendent` is "Superintendent"
   * where `MAIN_ROLES` says "Superintendent – Whole Plant", and likewise for the
   * other three management variants and for admin. The dropdown-facing label is
   * the fuller one, so it is the one kept. Note the separator is an **en dash**
   * (U+2013), as in the source.
   */
  label: string;
  /**
   * From the `ROLES` table (5–17) — `MAIN_ROLES` carries initials only per
   * group, so the twelve per-variant pairs exist nowhere else.
   */
  initials: string;
}

/**
 * The twelve, keyed the way they are addressed. Sparse on purpose: a
 * (role, sub-category) pair absent from `ROLE_SUB_CATEGORIES` has no variant,
 * and `variantFor` falls back rather than inventing one.
 */
const VARIANTS: Record<Role, Partial<Record<SubCategory, RoleVariant>>> = {
  [ROLES.OPERATOR]: {
    [SUB_CATEGORY.WHOLE_PLANT]: { label: "Operator", initials: "OP" },
  },
  [ROLES.SUPERVISOR]: {
    [SUB_CATEGORY.WHOLE_PLANT]: { label: "Supervisor", initials: "SV" },
    [SUB_CATEGORY.SHUTDOWN]: {
      label: "Shutdown Supervisor",
      initials: "SD",
    },
    [SUB_CATEGORY.PROCESS]: { label: "Process Supervisor", initials: "PV" },
    [SUB_CATEGORY.UTILITY]: { label: "Utility Supervisor", initials: "UV" },
    [SUB_CATEGORY.STORAGE_LOADING]: {
      label: "Storage & Loading Supervisor",
      initials: "SG",
    },
  },
  [ROLES.MANAGEMENT]: {
    [SUB_CATEGORY.WHOLE_PLANT]: {
      label: "Superintendent – Whole Plant",
      initials: "SI",
    },
    [SUB_CATEGORY.PROCESS]: {
      label: "Superintendent – Process (All Trains)",
      initials: "PS",
    },
    [SUB_CATEGORY.UTILITY]: {
      label: "Superintendent – Utility",
      initials: "US",
    },
    [SUB_CATEGORY.STORAGE_LOADING]: {
      label: "Superintendent – Storage & Loading",
      initials: "SL",
    },
  },
  [ROLES.ADMINISTRATOR]: {
    [SUB_CATEGORY.WHOLE_PLANT]: { label: "Administrator", initials: "AD" },
  },
  [ROLES.SUPER_USER]: {
    [SUB_CATEGORY.WHOLE_PLANT]: { label: "Super User", initials: "SU" },
  },
};

/** The role's default sub-category — its first, per `m.types[0]` (line 263). */
export const defaultSubCategory = (role: Role): SubCategory =>
  ROLE_SUB_CATEGORIES[role][0];

/**
 * The variant for a pair, falling back to the role's default when the
 * sub-category does not belong to it. Callers hold a `SubCategory` that may have
 * come from a previous role, which is exactly the case line 263 handles.
 */
export const variantFor = (role: Role, subCategory: SubCategory): RoleVariant =>
  VARIANTS[role][subCategory] ?? VARIANTS[role][defaultSubCategory(role)]!;

/**
 * Switching group, preserving the sub-type where it survives — line 263's
 * `m.types.find(t => t.role === cur) || m.types[0]`.
 *
 * "Utility Supervisor" → the Supervisor row keeps you on Utility; → the
 * Superintendent row keeps Utility too, because Management offers it; → the
 * Operator row falls back to whole-plant, because Operator offers nothing else.
 */
export const subCategoryOnSwitch = (
  target: Role,
  current: SubCategory
): SubCategory =>
  ROLE_SUB_CATEGORIES[target].includes(current)
    ? current
    : defaultSubCategory(target);

/**
 * The module keys each role carries, transcribed from the `ROLES` table's `nav`
 * arrays (5–17). `SUPNAV` (line 3) is shared by four supervisor variants and
 * matched item-for-item by the fifth, and all four management variants are
 * identical — so this is keyed by role, which is why there are **five** nav sets
 * and not twelve.
 *
 * ⚠️ **Four of these keys have no route in this build**: `trends`, `reports`,
 * `dashboards` and `decisions`. They are real BRD features (FR-AN-*, FR-REP-*,
 * FR-DASH-*) that are simply unbuilt, and they are kept here because the
 * switcher's "N modules" subtitle is **derived from this list** and must read
 * the role's module entitlement — 5 / 6 / 5, as the prototype shows — rather
 * than however much of it this build has finished. `Sidebar` renders only the
 * keys that resolve to a route, so no dead link is ever shown.
 */
export const ROLE_MODULES: Record<Role, readonly string[]> = {
  [ROLES.OPERATOR]: [
    "dashboard",
    "pending",
    "assistant",
    "summary",
    "notifications",
  ],
  // `SUPNAV`, line 3.
  [ROLES.SUPERVISOR]: [
    "dashboard",
    "pending",
    "summary",
    "assistant",
    "trends",
    "notifications",
  ],
  [ROLES.MANAGEMENT]: [
    "dashboard",
    "assistant",
    "trends",
    "reports",
    "notifications",
  ],
  [ROLES.ADMINISTRATOR]: [
    "dashboard",
    "admin",
    "audit",
    "trends",
    "reports",
    "notifications",
  ],
  [ROLES.SUPER_USER]: [
    "dashboard",
    "admin",
    "dashboards",
    "audit",
    "notifications",
  ],
};

/** The module key `navItems()` splices in — `app-source.txt` 286. */
export const DECISIONS_MODULE = "decisions";

/**
 * `navItems()`, lines 282–288: with the decision workflow enabled, a
 * **management** role gains "Decision Workflow" immediately after Dashboard.
 * No other role does, which is §6.3(b) — the workflow is Management's.
 *
 * Kept as a pure function of (role, enabled) so it is testable without a DOM,
 * and so the enabled flag stays where it belongs: `management_decision_workflow`
 * in the admin workflow config, read through `useIsWorkflowEnabled`.
 */
export const modulesFor = (
  role: Role,
  decisionWorkflowEnabled: boolean
): readonly string[] => {
  const modules = ROLE_MODULES[role];
  if (role !== ROLES.MANAGEMENT || !decisionWorkflowEnabled) return modules;

  const afterDashboard = modules.indexOf("dashboard") + 1;
  return [
    ...modules.slice(0, afterDashboard),
    DECISIONS_MODULE,
    ...modules.slice(afterDashboard),
  ];
};

/**
 * The switcher row's subtitle, derived rather than written down: a grouped role
 * counts its sub-types, an ungrouped one counts its modules (line 271). Today
 * that reads Operator "5 modules", Supervisor "5 types", Superintendent
 * "4 types", Administration "6 modules", Super User "5 modules".
 */
export const groupSubtitle = (role: Role): string =>
  hasSubCategories(role)
    ? `${ROLE_SUB_CATEGORIES[role].length} types`
    : `${ROLE_MODULES[role].length} modules`;
