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

// Three real filter chips (User, Action, Date) plus free-text search. User options come from the directory (/users), not the log, so paging never hides anyone; System-originated rows have no username, so the search box is how they're found instead.
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
        {/* alignItemWithTrigger's default aligns the selected item with the trigger, which read as opening upward with a fixed chip label — this opens below like every other dropdown. */}
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
              {/* The raw verb, as the column renders it — these are backend constants, not prose to relabel. */}
              <span className="font-mono text-xs">{action}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* From/To live behind one "Date" chip in a popover, matching the other two chips rather than adding two more controls to the row. */}
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
                max={filters.to || undefined} // stops the range being expressible backwards
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
