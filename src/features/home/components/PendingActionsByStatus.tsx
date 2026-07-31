"use client";

import Link from "next/link";
import { ListChecks } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { PieChart, type PieSlice } from "@/components/charts/PieChart";
import { toneAt } from "@/components/charts/tones";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import { useActionStatusCounts } from "@/features/actions/api/queries";
import { ACTION_STATUS_LABEL, ACTION_STATUS_VALUES } from "@/types/operations";

/**
 * Pending actions by status — FR-HOME-01's "pending actions", as the shape of
 * the workload rather than a count.
 *
 * **No chart-type toggle**, and that is a decision rather than an omission. The
 * prototype puts a bar/pie `chartSwitch` on its operator dashboard
 * (`app-source.txt` 561) and `ChartKindToggle` exists from Phase 0b — but §6.4
 * assigns switching insight chart types to the **Administrator**, as template
 * configuration, and **FR-DASH-04** limits a regular user to hiding, resizing
 * and saving widget layout. Chart type is not in that list. Prototype loses to
 * BRD; the toggle belongs to Phase 3's dashboard configuration.
 *
 * Zero-state matters here: a plant with no open actions is good news, and a
 * donut of nothing reads as a broken chart.
 */
export const PendingActionsByStatus = () => {
  const { data, isLoading } = useActionStatusCounts();

  const slices: PieSlice[] = ACTION_STATUS_VALUES.map((status, index) => ({
    label: ACTION_STATUS_LABEL[status],
    value: data?.byStatus[status] ?? 0,
    tone: toneAt(index),
  })).filter((slice) => slice.value > 0);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="size-4 text-primary" aria-hidden />
          Pending actions by status
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : total === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No pending actions"
            description="Nothing is outstanding across the plant right now."
          />
        ) : (
          <PieChart
            label="Pending actions by status"
            data={slices}
            centerLabel="actions"
            categoryHeader="Status"
            seriesName="Actions"
          />
        )}

        <Link
          href={ROUTES.ACTIONS}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          View all pending actions
        </Link>
      </CardContent>
    </Card>
  );
};
