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
  SUMMARY_EXPORT_FORMATS,
  type SummaryExportFormat,
} from "@/features/summaries/schemas";

/**
 * **FR-SUM-09** — "Export shift summaries to PDF, Excel and Word (Word lets
 * supervisors modify the report if required)."
 *
 * The menu is here, all three formats are here, and **none of them work** —
 * deliberately, and visibly.
 *
 * There is no export endpoint in the Phase 0a contract, and there should not be
 * one invented: rendering a paginated PDF that retains source citations
 * (FR-REP-03) is server work against the same records the summary cites. It is
 * **[BACKEND]**.
 *
 * The prototype resolves this with `toast(s.id + ' exported as PDF')`
 * (`app-source.txt` 1370, 1407) — a success message for something that did not
 * happen. That is a fabricated verification living inside the product, and a
 * demo audience cannot tell it from a real one. So each item is disabled and
 * says why. The requirement stays visible; the capability does not pretend.
 */

const FORMAT_LABEL: Record<SummaryExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
  word: "Word",
};

const FORMAT_ICON: Record<SummaryExportFormat, LucideIcon> = {
  pdf: FileType,
  excel: FileSpreadsheet,
  word: FileText,
};

interface SummaryExportMenuProps {
  summaryId: string;
}

export const SummaryExportMenu = ({ summaryId }: SummaryExportMenuProps) => (
  <DropdownMenu>
    {/*
      Children go on the trigger, not inside `render`. Base UI clones the
      `render` element and supplies its own children, so a `<Button>` written
      with children here renders without them — `components/layout/Header.tsx`
      is the working precedent for this shape.
    */}
    <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
      <Download aria-hidden />
      Export
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-64">
      {/*
        The group is required, not cosmetic: Base UI's label *is* a group label
        and throws without a group ancestor — it is not a bare heading like
        Radix's. Omitting it crashed the whole detail screen into the error
        boundary the moment the menu opened. `components/layout/Header.tsx`
        carries the same note.
      */}
      <DropdownMenuGroup>
        <DropdownMenuLabel>Export {summaryId}</DropdownMenuLabel>
        {SUMMARY_EXPORT_FORMATS.map((format) => {
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
        (FR-SUM-09).
      </p>
    </DropdownMenuContent>
  </DropdownMenu>
);
