"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actionFiltersSchema } from "@/features/actions/schemas";
import type { ActionFilters } from "@/features/actions/types";
import {
  ACTION_STATUS_LABEL,
  ACTION_STATUS_VALUES,
  PRIORITY_LABEL,
  PRIORITY_VALUES,
} from "@/types/operations";

/**
 * The prototype's toolbar (`app-source.txt` 1192–1196) — five dropdown chips
 * and a search box, none of which do anything there.
 *
 * Three of the five are here: Status, Priority and Area. **Equipment and Date
 * are not**, and that is deliberate rather than unfinished — a tag-level
 * equipment filter and a date-range picker are both real controls with no
 * requirement naming them for this screen, and `/actions` has no `equipment` or
 * date parameter in the Phase 0a contract. FR-AI-06 lists equipment/date-range
 * filtering for the *assistant*, not for the actions list.
 *
 * The prototype's fourth control — a data/empty/loading/error toggle (1195) —
 * is a demo device for showing off table states. Real Query states replace it.
 *
 * Areas are supplied by the caller rather than hardcoded: BRD §6.2 has the
 * Administrator define them ("area, unit or train"), so a fixed list would go
 * stale the first time OLNG adds one.
 */

interface ActionsFilterBarProps {
  filters: ActionFilters;
  isFiltered: boolean;
  /** Distinct areas present in the data, for the Area select. */
  areas: readonly string[];
  onChange: <TKey extends keyof ActionFilters>(
    key: TKey,
    value: ActionFilters[TKey]
  ) => void;
  onReset: () => void;
}

/** Narrows a Select's loosely-typed value back to the schema's union. */
const parseStatus = (value: unknown): ActionFilters["status"] => {
  const result = actionFiltersSchema.shape.status.safeParse(value);
  return result.success ? result.data : "all";
};

const parsePriority = (value: unknown): ActionFilters["priority"] => {
  const result = actionFiltersSchema.shape.priority.safeParse(value);
  return result.success ? result.data : "all";
};

export const ActionsFilterBar = ({
  filters,
  isFiltered,
  areas,
  onChange,
  onReset,
}: ActionsFilterBarProps) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="relative w-full max-w-[280px]">
      <Search
        // `start-3`, not `left-3`: the icon sits on the inline start, which
        // moves to the right edge under `dir="rtl"` (NFR-07).
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <label htmlFor="action-search" className="sr-only">
        Search actions
      </label>
      <Input
        id="action-search"
        type="search"
        placeholder="Search ID, title or equipment"
        className="ps-9"
        value={filters.search}
        onChange={(event) => onChange("search", event.target.value)}
      />
    </div>

    <Select
      value={filters.status}
      onValueChange={(value) => onChange("status", parseStatus(value))}
    >
      <SelectTrigger className="w-[160px]" aria-label="Filter by status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        {ACTION_STATUS_VALUES.map((status) => (
          <SelectItem key={status} value={status}>
            {ACTION_STATUS_LABEL[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select
      value={filters.priority}
      onValueChange={(value) => onChange("priority", parsePriority(value))}
    >
      <SelectTrigger className="w-[160px]" aria-label="Filter by priority">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All priorities</SelectItem>
        {PRIORITY_VALUES.map((priority) => (
          <SelectItem key={priority} value={priority}>
            {PRIORITY_LABEL[priority]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select
      value={filters.area}
      onValueChange={(value) => onChange("area", String(value))}
    >
      <SelectTrigger className="w-[160px]" aria-label="Filter by area">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All areas</SelectItem>
        {areas.map((area) => (
          <SelectItem key={area} value={area}>
            {area}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/*
      FR-PA-06's derived flag as a filter. A checkbox rather than another
      status option, because `Overdue` is deliberately not a status — see
      `types/operations.ts`.
    */}
    <label className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
      <input
        type="checkbox"
        className="size-4 accent-primary"
        checked={filters.overdueOnly}
        onChange={(event) => onChange("overdueOnly", event.target.checked)}
      />
      Overdue only
    </label>

    {isFiltered ? (
      <Button type="button" variant="ghost" onClick={onReset}>
        <X className="size-4" aria-hidden />
        Clear
      </Button>
    ) : null}
  </div>
);
