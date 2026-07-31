"use client";

import { useState } from "react";
import { MessagesSquare, Send } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useActionComments } from "@/features/actions/api/queries";
import { useAddActionComment } from "@/features/actions/api/mutations";
import { useSession } from "@/features/auth/hooks/useSession";
import { hasPermission } from "@/lib/auth/permissions";
import { initialsOf } from "@/lib/initials";

/**
 * The comment thread on an action — the prototype's Comments card
 * (`app-source.txt` 1287–1294).
 *
 * **FR-SUM-08 / §6.1** are the model for who may post: comment access is granted
 * by the Administrator / Super User, "otherwise the summary is view-only".
 *
 * ⚠️ Both are worded *"on a shift summary"* — **the BRD is silent on comments
 * against a pending action**, so applying the summary toggle here is an
 * inference, the same one `actions/[id]/comments/route.ts` records and
 * escalates. It fails closed and mirrors the API exactly, which is why it is
 * safe; it is not something FR-SUM-08 licenses. The
 * prototype checks `role === 'operator' && !opComment` (1292), which is exactly
 * the role-shaped test that failed open on the server side — a multi-role
 * operator slipped through it. Here the UI asks the same permission-shaped
 * question the API does.
 *
 * **The UI check is cosmetic and that is the point.** FR-ADM-03 requires RBAC
 * "independently at both API and UI layers": the server 403s regardless, and if
 * this component's reasoning were wrong the write would still be refused. It
 * exists so a user is told *before* typing, not after.
 */

interface ActionCommentsProps {
  actionId: string;
  /**
   * Whether the Administrator has enabled operator commenting. Passed in rather
   * than fetched here so the whole detail screen asks once.
   */
  commentingEnabled: boolean;
}

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const formatTime = (iso: string): string => {
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? "" : timeFormatter.format(parsed);
};

export const ActionComments = ({
  actionId,
  commentingEnabled,
}: ActionCommentsProps) => {
  const [draft, setDraft] = useState("");
  const { permissions } = useSession();
  const { data, isLoading } = useActionComments(actionId);
  const addComment = useAddActionComment(actionId);

  const mayComment =
    hasPermission(permissions, "summary:comment") || commentingEnabled;

  const submit = () => {
    const body = draft.trim();
    if (!body) return;

    addComment.mutate({ body }, { onSuccess: () => setDraft("") });
  };

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : data && data.items.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {data.items.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
                aria-hidden
              >
                {initialsOf(comment.author.displayName)}
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm">
                  <span className="font-semibold">
                    {comment.author.displayName}
                  </span>
                  <span className="ms-2 text-xs text-muted-foreground">
                    {formatTime(comment.createdAt)}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={MessagesSquare}
          title="No comments yet"
          description="Notes added to this action appear here."
        />
      )}

      {mayComment ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="action-comment" className="sr-only">
            Add a comment
          </label>
          <Textarea
            id="action-comment"
            rows={2}
            placeholder="Add a comment…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button
            type="button"
            className="self-end"
            disabled={!draft.trim() || addComment.isPending}
            onClick={submit}
          >
            <Send aria-hidden />
            {addComment.isPending ? "Posting…" : "Post"}
          </Button>
        </div>
      ) : (
        /*
          §6.1's exact situation: view-only. The prototype words this well and
          the wording is kept — it names *who* turned it off, which is what
          tells the user whom to ask.
        */
        <p className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
          Commenting is turned off by your administrator — you can view comments
          but cannot add them.
        </p>
      )}
    </div>
  );
};
