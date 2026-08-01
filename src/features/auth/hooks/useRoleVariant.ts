"use client";

import { useCallback } from "react";

import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { ROLE_VALUES, type Role } from "@/constants/roles";
import {
  defaultSubCategory,
  subCategoryOnSwitch,
  variantFor,
  type SubCategory,
} from "@/constants/subCategories";
import { useSession } from "@/features/auth/hooks/useSession";
import { hasPermission } from "@/lib/auth/permissions";
import { useAuthStore } from "@/store/authStore";

/**
 * Who the shell is being viewed as — the session's own role, or the one an
 * administrator is impersonating.
 *
 * ## The gate is the wildcard, not a new permission string
 *
 * `Permission` is *derived* from `ROLE_PERMISSIONS` (`constants/permissions.ts`)
 * so the union and the table cannot drift. Minting `session:impersonate` would
 * therefore mean adding it to some role's list — and the only role that should
 * hold it is the Administrator, whose list is literally `["*"]`, which §5/§6
 * forbid expanding. So the requirement is the wildcard itself: an administrator
 * satisfies it, nobody else does, and no vocabulary had to be invented. The
 * demo's administrator account already carries it, so the flow is clickable
 * without seeding anything.
 *
 * **This gate is cosmetic, like every UI gate here.** FR-ADM-03 is satisfied by
 * `RoleGuard` and by the API, which never see impersonation at all.
 */
const isRole = (value: string): value is Role =>
  ROLE_VALUES.some((role) => role === value);

export interface RoleVariantState {
  /** The role the shell renders as. */
  role: Role;
  subCategory: SubCategory;
  /** Its label and initials — `constants/subCategories.ts`. */
  variant: { label: string; initials: string };
  /** The session's real role, which impersonation never changes. */
  actualRole: Role | null;
  isImpersonating: boolean;
  canImpersonate: boolean;
  /** Switch group, preserving the sub-type where the target offers it. */
  switchGroup: (target: Role) => void;
  switchSubCategory: (target: SubCategory) => void;
}

export const useRoleVariant = (): RoleVariantState => {
  const { session, permissions } = useSession();
  const impersonation = useAuthStore((state) => state.impersonation);
  const setImpersonation = useAuthStore((state) => state.setImpersonation);

  /*
    The first role the session holds that this build can name. A session may
    carry several (FR-AUTH-03 unions them) or one this build has never heard of
    (§6 custom roles) — neither is an error, and neither has a variant, so the
    controls simply do not render for it.
  */
  const actualRole = session?.roles.find(isRole) ?? null;

  const role = impersonation?.role ?? actualRole ?? null;
  const subCategory =
    impersonation?.subCategory ??
    (role ? defaultSubCategory(role) : "whole_plant");

  const canImpersonate = hasPermission(permissions, WILDCARD_PERMISSION);

  const switchGroup = useCallback(
    (target: Role) => {
      setImpersonation({
        role: target,
        // Line 263: keep the sub-type when the target group offers it.
        subCategory: subCategoryOnSwitch(target, subCategory),
      });
    },
    [setImpersonation, subCategory]
  );

  const switchSubCategory = useCallback(
    (target: SubCategory) => {
      if (!role) return;
      setImpersonation({ role, subCategory: target });
    },
    [role, setImpersonation]
  );

  const effectiveRole = role ?? "operator";

  return {
    role: effectiveRole,
    subCategory,
    variant: variantFor(effectiveRole, subCategory),
    actualRole,
    isImpersonating: impersonation !== null,
    canImpersonate,
    switchGroup,
    switchSubCategory,
  };
};
