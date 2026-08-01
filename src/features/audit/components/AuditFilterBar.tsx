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
import { MAX_PAGE_SIZE } from "@/constants/api";
import { AUDIT_ACTIONS, auditFiltersSchema } from "@/features/audit/schemas";
import type { AuditFilters } from "@/features/audit/types";
import { useUsersList } from "@/features/users/api/queries";

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

/**
 * The prototype's three chips — User, Action, Date (`app-source.txt` 1650) —
 * built as real controls. In the prototype they are `<div>`s with a chevron and
 * no `onClick`: a visual affordance with no filter model behind it.
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

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="relative w-full max-w-[280px]">
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
          placeholder="Search action, target or user"
          className="ps-9"
          value={filters.search}
          onChange={(event) => onChange("search", event.target.value)}
        />
      </div>

      <Select
        value={filters.username}
        onValueChange={(value) => onChange("username", String(value))}
      >
        <SelectTrigger className="w-[180px]" aria-label="Filter by user">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
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
        <SelectTrigger className="w-[200px]" aria-label="Filter by action">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
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
          htmlFor="audit-to"
          className="text-xs font-medium text-muted-foreground"
        >
          To
        </label>
        <Input
          id="audit-to"
          type="date"
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
};
