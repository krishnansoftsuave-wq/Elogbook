"use client";

import { Download, FileSpreadsheet, FileText, FileType } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TREND_EXPORT_FORMATS,
  type TrendExportFormat,
} from "@/features/trends/schemas";

/**
 * The Trends & KPIs export button — the prototype's `pageHead` action
 * (`this.btn('Export',{icon:'download',onClick:()=>this.toast('Trends
 * exported as PDF')})`, app-source.txt 1971).
 *
 * Shaped exactly like `features/summaries/components/SummaryExportMenu.tsx`:
 * every format renders, every item is `disabled`, and a note names what is
 * missing rather than faking a download or a success toast. **Not** imported
 * from `features/summaries` — `TREND_EXPORT_FORMATS` is this schema's own
 * constant (`features/trends/schemas.ts`), separate from
 * `SUMMARY_EXPORT_FORMATS` on purpose: **FR-SUM-09** and **FR-REP-03** are two
 * requirements that happen to name the same three formats today, and sharing
 * one constant would make one silently follow the other if either changes.
 *
 * Cites two requirements, not one: **FR-REP-03** ("Export reports and query
 * results to PDF, Excel and Word") is the missing capability itself, and
 * **FR-REP-06** (every export recorded in the audit trail) is why a client-only
 * "fake download" would not even be a partial implementation — the audit
 * write is server work this build cannot fabricate.
 */

const FORMAT_LABEL: Record<TrendExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
  word: "Word",
};

const FORMAT_ICON: Record<TrendExportFormat, LucideIcon> = {
  pdf: FileType,
  excel: FileSpreadsheet,
  word: FileText,
};

export const TrendsExportMenu = () => (
  <DropdownMenu>
    {/*
      Children go on the trigger, not inside `render` — Base UI clones the
      `render` element and supplies its own children, so a `<Button>` written
      with children here renders without them. Same shape as
      `SummaryExportMenu.tsx` and `components/layout/Header.tsx`.
    */}
    <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
      <Download aria-hidden />
      Export
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-64">
      <DropdownMenuGroup>
        <DropdownMenuLabel>Export Trends &amp; KPIs</DropdownMenuLabel>
        {TREND_EXPORT_FORMATS.map((format) => {
          const Icon = FORMAT_ICON[format];
          return (
            <DropdownMenuItem key={format} disabled>
              <Icon aria-hidden />
              Export as {FORMAT_LABEL[format]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuGroup>
      <p className="px-1.5 py-1 text-xs text-muted-foreground">
        Export is generated on the server and is not available in this build
        (FR-REP-03), and every export must be recorded in the audit trail
        (FR-REP-06).
      </p>
    </DropdownMenuContent>
  </DropdownMenu>
);
