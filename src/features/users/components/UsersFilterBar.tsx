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
import { ROLE_LABEL, ROLE_VALUES } from "@/constants/roles";
import type { UserFilters } from "@/features/users/types";
import { userFiltersSchema } from "@/features/users/schemas";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

interface UsersFilterBarProps {
  filters: UserFilters;
  isFiltered: boolean;
  onChange: <TKey extends keyof UserFilters>(
    key: TKey,
    value: UserFilters[TKey]
  ) => void;
  onReset: () => void;
}

/** Narrows a Select's loosely-typed value back to the schema's union. */
const parseRole = (value: unknown): UserFilters["role"] => {
  const result = userFiltersSchema.shape.role.safeParse(value);
  return result.success ? result.data : "all";
};

const parseStatus = (value: unknown): UserFilters["status"] => {
  const result = userFiltersSchema.shape.status.safeParse(value);
  return result.success ? result.data : "all";
};

export const UsersFilterBar = ({
  filters,
  isFiltered,
  onChange,
  onReset,
}: UsersFilterBarProps) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="relative w-full max-w-[280px]">
      <Search
        // `start-3`, not `left-3`: the icon sits on the inline start, which
        // moves to the right edge under `dir="rtl"` (NFR-07). This screen
        // predates that convention and the rest of the app now follows it.
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <label htmlFor="user-search" className="sr-only">
        Search users
      </label>
      <Input
        id="user-search"
        type="search"
        // No email in the directory — identity comes from AD, which carries a
        // username and a display name.
        placeholder="Search name or username"
        className="ps-9"
        value={filters.search}
        onChange={(event) => onChange("search", event.target.value)}
      />
    </div>

    <Select
      value={filters.role}
      onValueChange={(value) => onChange("role", parseRole(value))}
    >
      <SelectTrigger className="w-[160px]" aria-label="Filter by role">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All roles</SelectItem>
        {ROLE_VALUES.map((role) => (
          <SelectItem key={role} value={role}>
            {ROLE_LABEL[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

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
