"use client";

import { Sparkles, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/hooks/useSession";
import { useSuggestions } from "@/features/suggestions/api/queries";
import { SuggestionCard } from "@/features/suggestions/components/SuggestionCard";
import { hasPermission } from "@/lib/auth/permissions";

/**
 * The Supervisor's review queue — **FR-PA-02**, the prototype's `aiPanel`
 * (`app-source.txt` 1231–1241), which lives inside the Pending Actions screen
 * rather than on a route of its own.
 *
 * ## Who sees it, and why not by role name
 *
 * Gated on `action:confirm`, held by Supervisor and Administrator. The prototype
 * tests `state.role === 'supervisor'` **literally** (1190), which is why its own
 * four Supervisor sub-roles — `sup_shutdown`, `sup_process`, `sup_utility`,
 * `sup_storage` — never see this panel despite sharing the Supervisor nav. A
 * permission check has no such blind spot, and it is the only shape that works
 * for an Administrator-created custom role (FR-ADM-02).
 *
 * ## Not gated on the workflow toggle, deliberately
 *
 * `supervisor_action_workflow` gates *assignment and tracking* (FR-PA-05).
 * §6.2(a) is explicit that review-and-confirm is **"the default"** — what a
 * Supervisor does before any Administrator enables anything. Gating this panel
 * on the toggle would make the Supervisor's baseline task unavailable by
 * default, which inverts the requirement.
 *
 * ## Renders nothing when the queue is empty
 *
 * No empty state. An empty review queue is the normal, good condition, and a
 * card announcing "nothing to review" above the actions table would be
 * permanent furniture for everyone who is not a Supervisor mid-shift.
 */
export const SuggestionsPanel = () => {
  const { permissions } = useSession();
  const mayConfirm = hasPermission(permissions, "action:confirm");

  // Gated through `enabled` rather than by returning early before the call:
  // hooks cannot be called conditionally, and an Operator should not fire a
  // request whose answer carries no button they can press.
  const { data, isLoading, isError } = useSuggestions({ enabled: mayConfirm });

  if (!mayConfirm) return null;

  /*
    An error is not an empty queue, and collapsing the two was the worse bug of
    the pair: a 500 on `/suggestions` made the panel vanish, and a Supervisor
    would hand over believing nothing needed confirming. The global
    `QueryCache.onError` toast is transient; this stays on screen.
  */
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI-suggested actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            The review queue could not be loaded, so this shift may have
            suggestions waiting. Reload to try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI-suggested actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const suggestions = data?.items ?? [];
  if (suggestions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" aria-hidden />
          AI-suggested actions
          <Badge variant="secondary">{suggestions.length} pending review</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {/*
            §6.2(a), near enough verbatim. It states the boundary the endpoint
            enforces: confirming records the action in the shift summary and
            assigns nothing to anybody.
          */}
          Confirming records the action in the shift summary. No task is
          assigned to an operator, and there is no escalation step.
        </p>

        <ul className="flex flex-col gap-3">
          {suggestions.map((suggestion) => (
            <SuggestionCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
