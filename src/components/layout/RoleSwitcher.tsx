"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { WORKFLOW_PERMISSION } from "@/features/admin/schemas";
import {
  groupSubtitle,
  hasSubCategories,
  ROLE_GROUP,
  ROLE_GROUP_ORDER,
  variantFor,
} from "@/constants/subCategories";
import { useUpdateWorkflow } from "@/features/admin/api/mutations";
import { useIsWorkflowEnabled } from "@/features/admin/api/queries";
import { useRoleVariant } from "@/features/auth/hooks/useRoleVariant";
import { useSession } from "@/features/auth/hooks/useSession";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

const DECISION_WORKFLOW = "management_decision_workflow" as const;

interface RoleSwitcherProps {
  /** The rail is 4rem wide when collapsed — no room for the two label lines. */
  collapsed: boolean;
}

/**
 * The main-role switcher — the prototype's `roleControl()` / `roleMenu()`
 * (`app-source.txt` 247–280), in the sidebar footer above Sign out.
 *
 * ## Five rows, not twelve
 *
 * The menu lists the **groups** (`MAIN_ROLES`), never the variants; picking a
 * sub-type is the top bar's job (`SubTypePill`). Each row's subtitle is derived
 * — `N types` for a grouped role, `N modules` otherwise (line 271) — so it can
 * never drift from the data behind it.
 *
 * The active row compares the **group**, not the exact variant, so a Utility
 * Supervisor sees the Supervisor row checked. Switching group preserves the
 * sub-type when the target offers it (line 263, `subCategoryOnSwitch`).
 *
 * ## The chevron looks inverted and is not
 *
 * `expand_less` when closed, `expand_more` when open (line 256). The menu opens
 * *upward*, so the glyph points the way the panel will travel. Transcribed
 * deliberately — this is not a bug to tidy.
 *
 * ## Impersonation, gated
 *
 * Rendered only for a session holding the wildcard — `useRoleVariant` explains
 * why that is the gate rather than a minted `session:impersonate`. It changes
 * what the shell *shows*, never what the session *may do*: the token is
 * untouched and `RoleGuard` and the API are unaware of it (FR-ADM-03).
 */
export const RoleSwitcher = ({ collapsed }: RoleSwitcherProps) => {
  const { role, subCategory, canImpersonate, switchGroup } = useRoleVariant();
  const { permissions } = useSession();

  const workflowEnabled = useIsWorkflowEnabled(DECISION_WORKFLOW);
  const updateWorkflow = useUpdateWorkflow();

  if (!canImpersonate) return null;

  const group = ROLE_GROUP[role];
  const current = variantFor(role, subCategory);
  // §6.4 — the four switches are Administrator/Super-User configuration, so the
  // toggle is read-only for anyone who cannot write it. It is server state
  // either way: there is no second copy of `enabled` anywhere in the client.
  const mayToggle = hasPermission(
    permissions,
    WORKFLOW_PERMISSION[DECISION_WORKFLOW]
  );

  return (
    <div className="-mx-3 mt-auto border-t border-sidebar-border px-3 pt-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className={cn(
                "group/role h-auto w-full gap-2.5 bg-sidebar-accent/40 py-2 text-start",
                collapsed ? "justify-center px-0" : "justify-start px-2.5"
              )}
              aria-label={`Switch role — currently ${current.label}`}
            />
          }
        >
          <span
            className="flex size-[1.875rem] shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[0.71875rem] font-bold text-on-brand"
            aria-hidden
          >
            {current.initials}
          </span>

          <span
            className={cn(
              "flex min-w-0 flex-1 flex-col",
              collapsed && "sr-only"
            )}
          >
            {/* `M.types ? M.main : 'Role'` — line 253. */}
            <span className="text-[0.625rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              {hasSubCategories(role) ? group.label : "Role"}
            </span>
            <span className="truncate text-[0.8125rem] font-semibold text-sidebar-foreground">
              {current.label}
            </span>
          </span>

          {collapsed ? null : (
            /* Up when closed, down when open — the menu opens upward. */
            <>
              <ChevronUp
                className="size-4 shrink-0 text-muted-foreground group-data-[popup-open]/role:hidden"
                aria-hidden
              />
              <ChevronDown
                className="hidden size-4 shrink-0 text-muted-foreground group-data-[popup-open]/role:block"
                aria-hidden
              />
            </>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="top"
          align="start"
          className="max-h-[72vh] w-64 overflow-y-auto p-0"
        >
          <DropdownMenuGroup>
            {/* Sticky, as in the source — the list scrolls under it at 72vh. */}
            <DropdownMenuLabel className="sticky top-0 z-10 border-b bg-popover px-3.5 py-2.5 text-[0.65625rem] font-bold tracking-[0.1em] text-muted-foreground uppercase">
              Switch role
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          <DropdownMenuRadioGroup
            value={role}
            /* Narrowed against the list that produced the rows, rather than
               cast: Base UI types a radio group's value as `unknown`. */
            onValueChange={(value) => {
              const target = ROLE_GROUP_ORDER.find((role) => role === value);
              if (target) switchGroup(target);
            }}
          >
            {ROLE_GROUP_ORDER.map((candidate) => {
              const active = candidate === role;
              const row = ROLE_GROUP[candidate];

              return (
                <DropdownMenuRadioItem
                  key={candidate}
                  value={candidate}
                  closeOnClick
                  className={cn(
                    "gap-2.5 rounded-none border-s-[3px] border-transparent py-2.5",
                    "data-checked:border-s-primary data-checked:bg-accent",
                    "ps-3.5 rtl:pr-1.5 rtl:pl-8"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold",
                      active
                        ? "bg-sidebar-primary text-on-brand"
                        : "bg-muted text-muted-foreground"
                    )}
                    aria-hidden
                  >
                    {row.initials}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[0.8125rem] font-semibold">
                      {row.label}
                    </span>
                    <span className="truncate text-[0.6875rem] text-muted-foreground">
                      {groupSubtitle(candidate)}
                    </span>
                  </span>
                  {/*
                    No tick here. `DropdownMenuRadioItem` already renders one
                    through `RadioItemIndicator`, positioned absolutely at
                    `right-2`; a second inline one drew the selected row with
                    two checkmarks side by side. The primitive's is the one to
                    keep — it is driven by the radio group's own state rather
                    than by a parallel `active` comparison that could disagree
                    with it.
                  */}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>

          {/*
            The menu footer's workflow toggle (275–279). Not decorative: with it
            on, a management role's nav gains "Decision Workflow" after Dashboard
            (`modulesFor`, `navItems()` 282–288).

            Deliberately outside the radio group — it is not one of the choices,
            and Base UI would otherwise treat it as a menu item to arrow onto.
          */}
          <div className="flex items-center justify-between gap-2.5 border-t px-3.5 py-3">
            <span className="flex min-w-0 flex-col">
              <span
                className="text-[0.78125rem] font-semibold"
                id="decision-workflow-label"
              >
                Decision workflow
              </span>
              <span className="text-[0.6875rem] text-muted-foreground">
                {workflowEnabled
                  ? "On · approvals required"
                  : "Off · direct actions"}
              </span>
            </span>
            {/* The primitive, not the prototype's `div` with an `onClick` —
                that one is unreachable by keyboard and announces nothing. */}
            <Switch
              checked={workflowEnabled}
              disabled={!mayToggle || updateWorkflow.isPending}
              aria-labelledby="decision-workflow-label"
              onCheckedChange={(checked) =>
                updateWorkflow.mutate({
                  key: DECISION_WORKFLOW,
                  enabled: checked,
                })
              }
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
