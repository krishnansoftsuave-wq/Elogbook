"use client";

import { useState } from "react";
import { MessagesSquare, Send } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAddSummaryComment } from "@/features/summaries/api/mutations";
import type { SummaryComment } from "@/features/summaries/schemas";
import { useSession } from "@/features/auth/hooks/useSession";
import { hasPermission } from "@/lib/auth/permissions";
import { formatPlantDateTime } from "@/lib/datetime";
import { initialsOf } from "@/lib/initials";

/**
 * The comment thread on a summary — prototype `summaryDetail()`'s Comments card
 * (`app-source.txt` 1422–1428).
 *
 * **FR-SUM-08**, verbatim: "Control comment access on a shift summary for
 * Operator and Supervisor through the Admin / Super User." Unlike the same
 * control on an action, this is the exact surface the requirement names — no
 * inference is involved here.
 *
 * The predicate mirrors `summaries/[id]/comments/route.ts:50-54` exactly: the
 * session holds `summary:comment`, **or** the Administrator has enabled the
 * `operator_comment_permission` workflow. The prototype instead tests
 * `role === 'operator' && !opComment` (1426) — a role-shaped check, which is the
 * shape that failed open on the server for a user holding two roles. Asking the
 * permission question is what makes a custom role (FR-ADM-02) behave.
 *
 * **The UI check is cosmetic, and that is the point.** FR-ADM-03 requires RBAC
 * "independently at both API and UI layers": the server 403s regardless, and if
 * this component's reasoning were wrong the write would still be refused. It
 * exists so a user is told before typing, not after.
 *
 * Comments arrive with the summary rather than from their own endpoint — there
 * is no `GET /summaries/:id/comments` — so they are a prop, not a query.
 */

interface SummaryCommentsProps {
  summaryId: string;
  comments: readonly SummaryComment[];
  /**
   * Whether the Administrator has enabled operator commenting. Passed in rather
   * than fetched here so the whole detail screen asks once.
   */
  commentingEnabled: boolean;
}

export const SummaryComments = ({
  summaryId,
  comments,
  commentingEnabled,
}: SummaryCommentsProps) => {
  const [draft, setDraft] = useState("");
  const { permissions } = useSession();
  const addComment = useAddSummaryComment(summaryId);

  const mayComment =
    hasPermission(permissions, "summary:comment") || commentingEnabled;

  const submit = () => {
    const body = draft.trim();
    if (!body) return;

    addComment.mutate({ body }, { onSuccess: () => setDraft("") });
  };

  return (
    <div className="flex flex-col gap-4">
      {comments.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
                aria-hidden
              >
                {initialsOf(comment.author.displayName)}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-sm">
                  <span className="font-semibold">
                    {comment.author.displayName}
                  </span>
                  <span className="ms-2 text-xs text-muted-foreground">
                    {formatPlantDateTime(comment.createdAt)}
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
          description="Notes added to this summary appear here."
        />
      )}

      {mayComment ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="summary-comment" className="sr-only">
            Add a comment
          </label>
          <Textarea
            id="summary-comment"
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
          The prototype words this well and the wording is kept — it names *who*
          turned it off, which is what tells the reader whom to ask (1427).
        */
        <p className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
          Commenting is turned off by your administrator — you can view comments
          but cannot add them.
        </p>
      )}
    </div>
  );
};
