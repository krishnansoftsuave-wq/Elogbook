"use client";

import { CalendarRange, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAX_PAGE_SIZE } from "@/constants/api";
import { AUDIT_ACTIONS, auditFiltersSchema } from "@/features/audit/schemas";
import type { AuditFilters } from "@/features/audit/types";
import { useUsersList } from "@/features/users/api/queries";
import { formatShiftDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

interface AuditFilterBarProps {
  filters: AuditFilters;
  isFiltered: boolean;
  onChange: <TKey extends keyof AuditFilters>(
    key: TKey,
    value: AuditFilters[TKey]
  ) => void;
  onReset: () => void;
}

/** Narrows a Select's loosely-typed value back to the schema's union. */
const parseAction = (value: unknown): AuditFilters["action"] => {
  const result = auditFiltersSchema.shape.action.safeParse(value);
  return result.success ? result.data : "all";
};

/** `YYYY-MM-DD` (the `<input type="date">` value) → `10 Jun 2025`. */
const formatFilterDate = (isoDate: string): string =>
  formatShiftDate(isoDate.replaceAll("-", ""));

/** Shared chip look for all three triggers — compact, pill-shaped, white. */
const CHIP_TRIGGER_CLASS =
  "h-8 w-fit gap-1.5 rounded-full border-input bg-card px-3 text-sm font-normal";

/**
 * The prototype's three chips — User, Action, Date (`app-source.txt` 1650) —
 * built as real controls, restyled to the prototype's compact pill shape
 * rather than the wide labelled selects an earlier pass used. In the
 * prototype they are `<div>`s with a chevron and no `onClick`: a visual
 * affordance with no filter model behind it.
 *
 * **The User options come from the directory, not from the log.** Deriving them
 * from the fetched page would offer only the people who happen to appear on it,
 * which changes as you page and silently hides everyone else — the same trap
 * `ActionsTable` avoids by giving its area filter its own unfiltered query.
 * `/users` is the honest source and an Administrator can already read it.
 *
 * ⚠️ System-originated rows (`actor: null`, the retention purge) cannot be
 * reached by the User filter, because they have no username to select. The
 * search box finds them by the word "System", which is what the table renders.
 *
 * **The free-text search has no prototype counterpart.** Kept, because
 * narrowing by target or user id is real capability the three chips alone
 * cannot offer — the prototype's chips are non-functional, so it never had to
 * choose between the two.
 */
export const AuditFilterBar = ({
  filters,
  isFiltered,
  onChange,
  onReset,
}: AuditFilterBarProps) => {
  const { data: directory } = useUsersList({
    page: 1,
    // One page of everybody — a filter's options must not paginate.
    pageSize: MAX_PAGE_SIZE,
    search: "",
    role: "all",
    status: "all",
  });

  const people = directory?.items ?? [];
  const selectedPerson = people.find((p) => p.username === filters.username);
  const dateIsSet = Boolean(filters.from || filters.to);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-[220px]">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <label htmlFor="audit-search" className="sr-only">
          Search the audit log
        </label>
        <Input
          id="audit-search"
          type="search"
          placeholder="Search"
          className="h-8 rounded-full bg-card ps-9"
          value={filters.search}
          onChange={(event) => onChange("search", event.target.value)}
        />
      </div>

      <Select
        value={filters.username}
        onValueChange={(value) => onChange("username", String(value))}
      >
        <SelectTrigger
          className={CHIP_TRIGGER_CLASS}
          aria-label="Filter by user"
        >
          <SelectValue>
            {() =>
              filters.username === "all"
                ? "User"
                : (selectedPerson?.displayName ?? "User")
            }
          </SelectValue>
        </SelectTrigger>
        {/*
          `alignItemWithTrigger` (the default) lines the *selected* item up
          with the trigger, native-`<select>` style — with a fixed trigger
          label instead of the selected value, that put "All users" over the
          chip itself and the list above and below it, so the menu read as
          opening upward. A chip is a button, not a native select; the popup
          should just open below it like every other dropdown here.
        */}
        <SelectContent alignItemWithTrigger={false} align="start">
          <SelectItem value="all">All users</SelectItem>
          {people.map((person) => (
            <SelectItem key={person.username} value={person.username}>
              {person.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.action}
        onValueChange={(value) => onChange("action", parseAction(value))}
      >
        <SelectTrigger
          className={CHIP_TRIGGER_CLASS}
          aria-label="Filter by action"
        >
          <SelectValue>
            {(value: AuditFilters["action"]) =>
              value === "all" ? (
                "Action"
              ) : (
                <span className="font-mono">{value}</span>
              )
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start">
          <SelectItem value="all">All actions</SelectItem>
          {AUDIT_ACTIONS.map((action) => (
            <SelectItem key={action} value={action}>
              {/* The raw verb, as the column renders it. These are constants a
                  backend emits, not prose — inventing twenty human labels would
                  be inventing copy, and the two would drift. */}
              <span className="font-mono text-xs">{action}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/*
        The prototype's third chip is a single "Date" affordance
        (`app-source.txt` 1650); this is a real range, so the two fields live
        behind it in a popover rather than spelled out on the row — one chip,
        same as the other two, not two extra controls next to them.
      */}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className={cn(CHIP_TRIGGER_CLASS, dateIsSet && "text-foreground")}
              aria-label="Filter by date"
            />
          }
        >
          <CalendarRange className="size-4 text-muted-foreground" aria-hidden />
          {dateIsSet
            ? [
                filters.from ? formatFilterDate(filters.from) : "…",
                filters.to ? formatFilterDate(filters.to) : "…",
              ].join(" – ")
            : "Date"}
        </PopoverTrigger>
        <PopoverContent className="w-auto">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="audit-from"
                className="text-xs font-medium text-muted-foreground"
              >
                From
              </label>
              <Input
                id="audit-from"
                type="date"
                className="w-[10.5rem]"
                // Stops the range being expressible backwards in the first
                // place, rather than validating it after the fact.
                max={filters.to || undefined}
                value={filters.from}
                onChange={(event) => onChange("from", event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="audit-to"
                className="text-xs font-medium text-muted-foreground"
              >
                To
              </label>
              <Input
                id="audit-to"
                type="date"
                className="w-[10.5rem]"
                min={filters.from || undefined}
                value={filters.to}
                onChange={(event) => onChange("to", event.target.value)}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {isFiltered ? (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          <X className="size-4" aria-hidden />
          Clear
        </Button>
      ) : null}
    </div>
  );
};
