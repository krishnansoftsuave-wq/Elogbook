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
import { entryFiltersSchema } from "@/features/entries/schemas";
import type { EntryFilters } from "@/features/entries/types";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "signed", label: "Signed" },
];

interface EntriesFilterBarProps {
  /** Disambiguates input ids when both panels are mounted at once. */
  idPrefix: string;
  filters: EntryFilters;
  isFiltered: boolean;
  onChange: <TKey extends keyof EntryFilters>(
    key: TKey,
    value: EntryFilters[TKey]
  ) => void;
  onReset: () => void;
}

/** Narrows a Select's loosely-typed value back to the schema's union. */
const parseStatus = (value: unknown): EntryFilters["status"] => {
  const result = entryFiltersSchema.shape.status.safeParse(value);
  return result.success ? result.data : "all";
};

export const EntriesFilterBar = ({
  idPrefix,
  filters,
  isFiltered,
  onChange,
  onReset,
}: EntriesFilterBarProps) => {
  const searchId = `${idPrefix}-entry-search`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-[280px]">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <label htmlFor={searchId} className="sr-only">
          Search entries
        </label>
        <Input
          id={searchId}
          type="search"
          placeholder="Search title or author"
          className="pl-9"
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
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isFiltered ? (
        <Button type="button" variant="ghost" onClick={onReset}>
          <X className="size-4" aria-hidden />
          Clear
        </Button>
      ) : null}
    </div>
  );
};
