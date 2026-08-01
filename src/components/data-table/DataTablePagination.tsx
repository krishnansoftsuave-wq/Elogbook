"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "@/constants/api";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
}

/**
 * First, last, and a band around the current page — a `null` marks an
 * elided run so a table with hundreds of pages (e.g. the audit log) still
 * renders a handful of buttons instead of one per page.
 */
const pageWindow = (page: number, pageCount: number): (number | null)[] => {
  const items: (number | null)[] = [];
  let previous = 0;
  for (let candidate = 1; candidate <= pageCount; candidate += 1) {
    const inBand = Math.abs(candidate - page) <= 1;
    if (candidate === 1 || candidate === pageCount || inBand) {
      if (previous && candidate - previous > 1) items.push(null);
      items.push(candidate);
      previous = candidate;
    }
  }
  return items;
};

/**
 * Server-side pagination: page/pageSize live in the query key, so changing
 * either refetches and caches automatically.
 */
export const DataTablePagination = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: DataTablePaginationProps) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <label htmlFor="page-size">Rows per page:</label>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
          disabled={disabled}
        >
          <SelectTrigger id="page-size" className="w-[4.5rem]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span aria-live="polite">
          {total === 0 ? "No results" : `${firstRow}–${lastRow} of ${total}`}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous page"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden />
        </Button>

        <nav aria-label="Pagination" className="flex items-center gap-1.5">
          {pageWindow(page, pageCount).map((pageNumber, index) =>
            pageNumber === null ? (
              <span
                key={`ellipsis-${index}`}
                aria-hidden
                className="px-1 text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={pageNumber}
                type="button"
                variant={pageNumber === page ? "default" : "outline"}
                size="icon-sm"
                aria-label={`Page ${pageNumber}`}
                aria-current={pageNumber === page ? "page" : undefined}
                disabled={disabled}
                className={cn(
                  "min-w-7 px-1.5",
                  pageNumber === page && "font-semibold"
                )}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </Button>
            )
          )}
        </nav>

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Next page"
          disabled={disabled || page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  );
};
