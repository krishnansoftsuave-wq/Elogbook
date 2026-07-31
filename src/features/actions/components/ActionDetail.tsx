"use client";

import Link from "next/link";
import { ArrowLeft, FileText, MessagesSquare, SearchX } from "lucide-react";

import { DetailField } from "@/components/DetailField";
import { EmptyState } from "@/components/EmptyState";
import { OverdueFlag } from "@/components/OverdueFlag";
import { PriorityDot } from "@/components/PriorityDot";
import { StatusPill } from "@/components/StatusPill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import { useAction } from "@/features/actions/api/queries";
import { ActionComments } from "@/features/actions/components/ActionComments";
import { ActionOwnerControl } from "@/features/actions/components/ActionOwnerControl";
import { ActionStatusControl } from "@/features/actions/components/ActionStatusControl";
import { useIsWorkflowEnabled } from "@/features/admin/api/queries";
import { useNow } from "@/hooks/useNow";
import { formatPlantTimestamp } from "@/lib/datetime";
import { ACTION_CATEGORY_LABEL, ACTION_SOURCE_LABEL } from "@/types/operations";

/**
 * One pending action — the prototype's `actionDetail`
 * (`app-source.txt` 1270–1319).
 *
 * What was ported: the Overview field grid, the status pill in the header, the
 * comment thread, and the back link.
 *
 * What was **not**, and why:
 *
 * - **Attachments** (1304). Three hardcoded filenames with a download icon that
 *   downloads nothing. No endpoint, no schema, no requirement in §7.6 — building
 *   it would be inventing a feature.
 * - **Timeline and Audit Trail cards** (1296–1303). Both are literal arrays in
 *   the render method, fabricated from the selected action ("Priority set to X",
 *   "Status → Y" with invented dates and authors). The real audit trail exists —
 *   FR-ADM-05, and Phase 0a records every mutation — but it is Administrator-only
 *   (`GET /audit` requires the wildcard) and belongs on the Phase 3 audit screen.
 *   Rendering a fake history beside real data is worse than rendering none.
 * - **The four-tab strip** (1277). Overview / Timeline / Comments / Audit Trail,
 *   where only Overview is wired. With two of the four cut, tabs over two
 *   sections is chrome; both render at once.
 */

interface ActionDetailProps {
  actionId: string;
}

/* Plant time, via `lib/datetime` — see the note in `ActionsTable`. */
const formatDate = formatPlantTimestamp;

export const ActionDetail = ({ actionId }: ActionDetailProps) => {
  const { data: action, isLoading, isError } = useAction(actionId);
  const commentingEnabled = useIsWorkflowEnabled("operator_comment_permission");
  const now = useNow();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !action) {
    return (
      <EmptyState
        icon={SearchX}
        title="Action not found"
        description="It may have been removed, or the id in the address bar is wrong."
        action={
          <Link href={ROUTES.ACTIONS} className={buttonVariants()}>
            <ArrowLeft aria-hidden />
            Back to pending actions
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold tracking-tight">
            {action.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {action.id} · {action.area} · {action.equipment}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <StatusPill kind="action" status={action.status} />
            <OverdueFlag dueAt={action.dueAt} status={action.status} at={now} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ActionStatusControl actionId={action.id} status={action.status} />
          <ActionOwnerControl actionId={action.id} owner={action.owner} />
          <Link
            href={ROUTES.ACTIONS}
            className={buttonVariants({ variant: "secondary" })}
          >
            {/* Mirrors with `dir`: "back" points the other way in Arabic. */}
            <ArrowLeft className="rtl:-scale-x-100" aria-hidden />
            Back to list
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-primary" aria-hidden />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {action.description}
            </p>

            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <DetailField label="Action ID">
                <span className="font-semibold text-accent-foreground">
                  {action.id}
                </span>
              </DetailField>
              <DetailField label="Area">{action.area}</DetailField>
              <DetailField label="Equipment">{action.equipment}</DetailField>
              <DetailField label="Priority">
                <PriorityDot priority={action.priority} />
              </DetailField>
              <DetailField label="Category">
                {ACTION_CATEGORY_LABEL[action.category]}
              </DetailField>
              <DetailField label="Source">
                {ACTION_SOURCE_LABEL[action.source]}
              </DetailField>
              <DetailField label="Due date">
                <span className="tabular-nums">{formatDate(action.dueAt)}</span>
              </DetailField>
              <DetailField label="Created by">
                {action.createdBy.displayName}
              </DetailField>
              <DetailField label="Owner">
                {/*
                  FR-PA-03 records an owner; FR-PA-05 gates *assigning* one. An
                  unassigned action is the BRD's default state, not missing data.
                */}
                {action.owner?.displayName ?? (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </DetailField>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessagesSquare className="size-4 text-primary" aria-hidden />
              Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionComments
              actionId={action.id}
              commentingEnabled={commentingEnabled}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
