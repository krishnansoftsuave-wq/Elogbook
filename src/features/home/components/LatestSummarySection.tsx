"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import { useLatestSummary } from "@/features/summaries/api/queries";
import type { SummarySectionKind } from "@/features/summaries/schemas";

/**
 * One section of the most recent shift summary, as a dashboard card.
 *
 * This is how three of FR-HOME-01's named items get answered — "events",
 * "safety observations" and (via critical alarms) what the operator most needs
 * to see on arrival. The prototype's own `dashWidgets` (`app-source.txt` 112)
 * lists "Current Shift Highlights" and "Critical Alarms" as separate widgets;
 * both are sections of the same summary, so they are the same component asked
 * for different kinds.
 *
 * Every item keeps its `recordId` — **FR-SUM-06**'s source reference. A
 * dashboard that shows a critical alarm without saying which log entry it came
 * from is exactly the un-traceable summary the requirement exists to prevent.
 *
 * All three cards call `useLatestSummary`, which is one query key and therefore
 * one request and one loading state.
 */

interface LatestSummarySectionProps {
  kind: SummarySectionKind;
  title: string;
  icon: LucideIcon;
  /** Shown when the summary exists but this section is empty. */
  emptyTitle: string;
  emptyDescription: string;
  /** Cap the rows so one busy shift cannot push the rest of the page away. */
  limit?: number;
}

export const LatestSummarySection = ({
  kind,
  title,
  icon: Icon,
  emptyTitle,
  emptyDescription,
  limit = 4,
}: LatestSummarySectionProps) => {
  const { data: summary, isLoading } = useLatestSummary();

  const section = summary?.sections.find(
    (candidate) => candidate.kind === kind
  );
  const items = section?.items ?? [];
  const shown = items.slice(0, limit);
  const hidden = items.length - shown.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Icon}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-3">
              {shown.map((item) => (
                <li
                  key={`${item.recordId}-${item.text}`}
                  className="flex flex-wrap items-start gap-x-2 gap-y-1"
                >
                  <SeverityBadge severity={item.severity} />
                  <p className="min-w-0 flex-1 text-sm">{item.text}</p>
                  <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                    {item.recordId}
                  </span>
                </li>
              ))}
            </ul>

            {/*
              Says what was left out rather than truncating silently — a card
              that shows four of nine without saying so misreports the shift.
            */}
            {hidden > 0 && summary ? (
              <Link
                href={ROUTES.SUMMARY_DETAIL(summary.id)}
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                {hidden} more in the full summary
              </Link>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
