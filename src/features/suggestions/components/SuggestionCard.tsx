"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

import { PriorityDot } from "@/components/PriorityDot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Suggestion } from "@/features/actions/schemas";
import { useConfirmSuggestion } from "@/features/suggestions/api/mutations";
import { cn } from "@/lib/utils";

/**
 * One AI-suggested action awaiting the Supervisor's decision — the prototype's
 * `aiPanel` card (`app-source.txt` 1234–1241).
 *
 * ## Confidence is shown, but not as a traffic light
 *
 * The prototype colours the confidence badge green ≥85 / amber ≥70 / red below
 * (1239). That is a *threshold the prototype invented*: §7.6 asks for neither a
 * confidence nor a source reference on a suggested action, and the only BRD
 * requirement about confidence anywhere is **FR-AI-05**, which is about the
 * assistant deciding *server-side* when to caveat an answer.
 *
 * So the number is rendered — it is genuinely useful to a reviewer — and the
 * invented thresholds are not. Colouring it would assert a plant-safety
 * judgement ("85% is good") that nobody has signed off, and WCAG 1.4.1 would
 * then require the same judgement in words anyway.
 *
 * ## Two buttons, both requirement-backed
 *
 * Confirm is **FR-PA-02**. Dismiss is **FR-FB-01** — "Capture user feedback on
 * AI answers and citations (thumbs up/down with an optional comment), and
 * **confirm/reject on AI-suggested pending actions**", High priority.
 *
 * An earlier version of this note said Dismiss was "not in the BRD at all".
 * That was wrong: §7.6's own table gives the Supervisor only a *confirm* verb,
 * which is what made it look unrequested, but §7.13 supplies the reject half in
 * as many words. It matters because FR-FB-01 attaches "an optional comment" to
 * **both** verbs — so the note travels with a dismissal too, not only with a
 * confirmation.
 */

interface SuggestionCardProps {
  suggestion: Suggestion;
}

export const SuggestionCard = ({ suggestion }: SuggestionCardProps) => {
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const confirm = useConfirmSuggestion(suggestion.id);

  const decide = (confirmed: boolean, note?: string) => {
    confirm.mutate({
      confirmed,
      ...(note ? { comment: note } : {}),
    });
  };

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {suggestion.title}
            <PriorityDot priority={suggestion.priority} />
          </p>
          <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
        </div>

        {/* Neutral by design — see the note above on invented thresholds. */}
        <Badge variant="secondary" className="shrink-0 tabular-nums">
          {suggestion.confidence}% confidence
        </Badge>
      </div>

      <p className="flex flex-wrap gap-x-2 gap-y-1 text-2xs text-muted-foreground">
        <span>{suggestion.sourceReference}</span>
        <span aria-hidden>·</span>
        <span>
          {suggestion.area} · {suggestion.equipment}
        </span>
      </p>

      {/*
        Rendered always and hidden, rather than mounted conditionally: the toggle
        carries `aria-controls` pointing at this id, and with the element absent
        a screen reader following that reference resolves to nothing. `hidden`
        also keeps a half-typed note if the box is collapsed and reopened.
      */}
      <div
        className="flex flex-col gap-2"
        hidden={!showComment}
        aria-hidden={!showComment}
      >
        <label htmlFor={`suggestion-${suggestion.id}`} className="sr-only">
          Comment on {suggestion.id}
        </label>
        <Textarea
          id={`suggestion-${suggestion.id}`}
          rows={2}
          placeholder="Note for the shift summary (optional)"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/*
          The queue holds several of these, so a bare "Confirm for summary"
          would give a screen-reader user three identically-named buttons with
          no way to tell which suggestion each belongs to. The id disambiguates
          them; the visible label stays short.
        */}
        <Button
          type="button"
          size="sm"
          aria-label={`Confirm ${suggestion.id} for the shift summary`}
          disabled={confirm.isPending}
          onClick={() => decide(true, comment.trim() || undefined)}
        >
          <Check aria-hidden />
          Confirm for summary
        </Button>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-label={`Dismiss ${suggestion.id}`}
          disabled={confirm.isPending}
          // The note travels with a dismissal too. FR-FB-01 attaches "an
          // optional comment" to confirm *and* reject, and "duplicate of
          // ACT-2038" is exactly the signal FR-FB-02 classifies.
          onClick={() => decide(false, comment.trim() || undefined)}
        >
          <X aria-hidden />
          Dismiss
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn(showComment && "text-muted-foreground")}
          aria-label={
            showComment
              ? `Hide the note on ${suggestion.id}`
              : `Add a note to ${suggestion.id}`
          }
          aria-expanded={showComment}
          aria-controls={`suggestion-${suggestion.id}`}
          onClick={() => setShowComment((open) => !open)}
        >
          {showComment ? "Hide note" : "Add a note"}
        </Button>
      </div>
    </li>
  );
};
