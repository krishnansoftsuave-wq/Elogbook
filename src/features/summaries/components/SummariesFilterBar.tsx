"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SummaryFilters } from "@/features/summaries/types";

/**
 * The prototype's toolbar (`app-source.txt` 1375–1377): a search box with no
 * `<input>` behind it and three chips — "All roles", "All shifts", "Jun 2025" —
 * none of which carry an `onClick`. All four are decoration there.
 *
 * What is here instead, and why each choice:
 *
 * - **Search** is real. `GET /summaries` matches id, name and author, so the
 *   placeholder names exactly those three rather than promising more.
 * - **A date range** replaces the "Jun 2025" chip. **FR-HOME-04** — "Allow
 *   browsing of previous shifts, dates, and other areas" — is a High-priority
 *   requirement, and a fixed month label is not browsing. `from`/`to` are a
 *   PROVISIONAL addition to the contract; see `summaries/route.ts`.
 * - **No "All roles" filter.** `generated_by_role` is a display label, and
 *   nothing in the contract filters on it. Authorization is never decided from a
 *   role name in this codebase, and offering a role filter here would be the
 *   first place that habit crept back in.
 * - **No "All shifts" filter.** A shift picker needs a shift *list*, and
 *   `/shifts/current` is the only shift endpoint in the Phase 0a contract. The
 *   date range covers the same intent with data that exists.
 * - **No area filter, because a summary has no area.** `summaryWireSchema`
 *   carries a shift, not a location — a shift summary covers the whole plant by
 *   construction. FR-HOME-04's "other areas" is answerable on `/actions`, which
 *   does have the field and does offer the control, and is simply not a question
 *   this resource can be asked.
 */

interface SummariesFilterBarProps {
  filters: SummaryFilters;
  isFiltered: boolean;
  onChange: <TKey extends keyof SummaryFilters>(
    key: TKey,
    value: SummaryFilters[TKey]
  ) => void;
  onReset: () => void;
}

export const SummariesFilterBar = ({
  filters,
  isFiltered,
  onChange,
  onReset,
}: SummariesFilterBarProps) => (
  <div className="flex flex-wrap items-end gap-2">
    <div className="relative w-full max-w-[280px]">
      <Search
        // `start-3`, not `left-3`: the icon sits on the inline start, which
        // moves to the right edge under `dir="rtl"` (NFR-07).
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <label htmlFor="summary-search" className="sr-only">
        Search summaries
      </label>
      <Input
        id="summary-search"
        type="search"
        placeholder="Search ID, shift name or author"
        className="ps-9"
        value={filters.search}
        onChange={(event) => onChange("search", event.target.value)}
      />
    </div>

    <div className="flex flex-col gap-1">
      <label
        htmlFor="summary-from"
        className="text-xs font-medium text-muted-foreground"
      >
        From
      </label>
      <Input
        id="summary-from"
        type="date"
        // Mobile-first: shrinks with the row rather than forcing a wrap at
        // 375px, where two 170px inputs plus the gap overflow the content box.
        className="w-full min-w-[9rem] sm:w-[10.5rem]"
        // Stops the range being expressible backwards in the first place,
        // rather than validating it after the fact.
        max={filters.to || undefined}
        value={filters.from}
        onChange={(event) => onChange("from", event.target.value)}
      />
    </div>

    <div className="flex flex-col gap-1">
      <label
        htmlFor="summary-to"
        className="text-xs font-medium text-muted-foreground"
      >
        To
      </label>
      <Input
        id="summary-to"
        type="date"
        // Mobile-first: shrinks with the row rather than forcing a wrap at
        // 375px, where two 170px inputs plus the gap overflow the content box.
        className="w-full min-w-[9rem] sm:w-[10.5rem]"
        min={filters.from || undefined}
        value={filters.to}
        onChange={(event) => onChange("to", event.target.value)}
      />
    </div>

    {isFiltered ? (
      <Button type="button" variant="ghost" onClick={onReset}>
        <X className="size-4" aria-hidden />
        Clear
      </Button>
    ) : null}
  </div>
);
