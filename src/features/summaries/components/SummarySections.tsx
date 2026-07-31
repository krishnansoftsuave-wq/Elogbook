"use client";

import {
  ClipboardList,
  ListChecks,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SeverityBadge } from "@/components/SeverityBadge";
import {
  SUMMARY_SECTION_KINDS,
  SUMMARY_SECTION_LABEL,
  type SummarySection,
  type SummarySectionKind,
} from "@/features/summaries/schemas";

/**
 * The four FR-SUM-01 sections — prototype `summaryDetail()`'s `sec(...)` blocks,
 * `app-source.txt` 1394–1399 and 1414–1417.
 *
 * **The prototype's bullets are hardcoded** (1414–1417): the same seven items and
 * the same `ELB-…` references render no matter which summary is open. Here they
 * come from `summary.sections[]`, and every item prints its own `recordId` —
 * which is **FR-SUM-06**, "Attach source references (shift date, timestamp,
 * record ID) to each summary". The prototype only simulates that.
 *
 * Sections render in `SUMMARY_SECTION_KINDS` order rather than the order the
 * response happens to arrive in, because FR-SUM-01 names them in a fixed order
 * and a handover report that reshuffles its headings between shifts is harder to
 * scan. A kind the payload omits is skipped; a kind with no items says so, since
 * "no critical alarms this shift" is a meaningful thing to report rather than an
 * empty space.
 *
 * Severity is a labelled badge, never a bare coloured dot. The prototype uses
 * colour alone (`'#C0392B'`, 1414–1417), which carries nothing for a reader who
 * cannot distinguish it — WCAG 2.1 **1.4.1 Use of Colour**. `PriorityDot`
 * already established the dot-plus-label shape in this repo.
 */

const SECTION_ICON: Record<SummarySectionKind, LucideIcon> = {
  activities: ClipboardList,
  critical_alarms: TriangleAlert,
  pending_actions: ListChecks,
  safety_observations: ShieldCheck,
};

interface SummarySectionsProps {
  sections: readonly SummarySection[];
}

export const SummarySections = ({ sections }: SummarySectionsProps) => {
  const byKind = new Map(sections.map((section) => [section.kind, section]));

  return (
    <div className="flex flex-col gap-6">
      {SUMMARY_SECTION_KINDS.filter((kind) => byKind.has(kind)).map((kind) => {
        const section = byKind.get(kind);
        if (!section) return null;

        const Icon = SECTION_ICON[kind];

        return (
          <section key={kind} className="flex flex-col gap-3">
            {/*
              `h2`, not `h3`. The page's only other heading is the `h1` in
              `PageHeader`, because `CardTitle` renders a `<div>` — so an `h3`
              here skipped a level, which a screen reader navigating by heading
              reports as a missing section.
            */}
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              {SUMMARY_SECTION_LABEL[kind]}
            </h2>

            {section.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing recorded for this shift.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {section.items.map((item) => (
                  <li
                    key={`${item.recordId}-${item.text}`}
                    className="flex flex-wrap items-start gap-x-2 gap-y-1"
                  >
                    <SeverityBadge severity={item.severity} />
                    <p className="min-w-0 flex-1 text-sm">{item.text}</p>
                    {/*
                      FR-SUM-06's source reference. Plain text for now: the
                      record lives in the source E-Logbook, which this platform
                      reads but does not host (FR-DATA-01), so there is no route
                      to link it to yet.
                    */}
                    <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                      {item.recordId}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
};
