"use client";

import { Briefcase, ChevronDown, Check } from "lucide-react";

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
import {
  hasSubCategories,
  ROLE_GROUP,
  ROLE_SUB_CATEGORIES,
  variantFor,
} from "@/constants/subCategories";
import { useRoleVariant } from "@/features/auth/hooks/useRoleVariant";
import { cn } from "@/lib/utils";

interface SubTypePillProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The sub-type picker — the prototype's `typeControl()` (`app-source.txt`
 * 227–245), in the top bar's right cluster ahead of the bell and the avatar.
 *
 * **It renders nothing for a role without sub-types**, which is line 229's
 * `if(!M.types) return null` — not a disabled pill. Operator, Administration and
 * Super User each have exactly one sub-category, so for them the top bar is
 * unchanged.
 *
 * Gated with the sidebar switcher it belongs to: both are admin impersonation
 * (`useRoleVariant`), and neither confers access — the route guard and the API
 * are the control (FR-ADM-03).
 */
export const SubTypePill = ({ open, onOpenChange }: SubTypePillProps) => {
  const { role, subCategory, canImpersonate, switchSubCategory } =
    useRoleVariant();

  if (!canImpersonate) return null;
  // Line 229. A role with one sub-category has nothing to pick between.
  if (!hasSubCategories(role)) return null;

  const group = ROLE_GROUP[role];
  const current = variantFor(role, subCategory);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              // The prototype's pill: 18px radius on a translucent white fill
              // over the teal band (231). Both come from `--on-brand` alphas
              // rather than the source's literal rgba.
              "h-auto max-w-[17.5rem] gap-2 rounded-full border-on-brand/25",
              "bg-on-brand/15 py-1.5 ps-3 pe-2.5 text-[0.78125rem] font-semibold",
              "text-on-brand hover:bg-on-brand/25 hover:text-on-brand",
              "focus-visible:ring-on-brand"
            )}
          />
        }
      >
        <Briefcase className="size-[0.9375rem] shrink-0" aria-hidden />
        <span className="truncate">{current.label}</span>
        <ChevronDown className="size-4 shrink-0" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[18.125rem] p-0">
        <DropdownMenuGroup>
          {/* "SUPERVISOR TYPE" / "SUPERINTENDENT TYPE" — `M.main+' type'`, 237. */}
          <DropdownMenuLabel className="border-b px-3.5 py-2.5 text-[0.65625rem] font-bold tracking-[0.1em] text-muted-foreground uppercase">
            {group.label} type
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuRadioGroup
          value={subCategory}
          /* Narrowed against the role's own list rather than cast — Base UI
             types a radio group's value as `unknown`. */
          onValueChange={(value) => {
            const target = ROLE_SUB_CATEGORIES[role].find(
              (candidate) => candidate === value
            );
            if (target) switchSubCategory(target);
          }}
        >
          {ROLE_SUB_CATEGORIES[role].map((candidate) => {
            const variant = variantFor(role, candidate);
            const active = candidate === subCategory;

            return (
              <DropdownMenuRadioItem
                key={candidate}
                value={candidate}
                closeOnClick
                className={cn(
                  // 3px accent on the leading edge, not `borderLeft` — it moves
                  // to the right edge under `dir="rtl"` (NFR-07).
                  "gap-2.5 rounded-none border-s-[3px] border-transparent py-2.5",
                  "data-checked:border-s-primary data-checked:bg-accent",
                  "ps-3.5 rtl:pr-1.5 rtl:pl-8 data-checked:text-brand-dark"
                )}
              >
                {/* The prototype's 7px dot (241). Decorative — the checked
                    state is carried by `aria-checked` on the row itself. */}
                <span
                  className={cn(
                    "size-[0.4375rem] shrink-0 rounded-full",
                    active ? "bg-primary" : "bg-muted-foreground/60"
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "flex-1 text-[0.78125rem]",
                    active ? "font-semibold" : "font-medium"
                  )}
                >
                  {variant.label}
                </span>
                {active ? (
                  <Check className="size-4 shrink-0 text-primary" aria-hidden />
                ) : null}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
