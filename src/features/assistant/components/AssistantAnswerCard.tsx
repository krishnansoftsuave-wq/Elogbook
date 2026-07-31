"use client";

import { useState } from "react";
import { Sparkles, ThumbsDown, ThumbsUp, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitAssistantFeedback } from "@/features/assistant/api/mutations";
import { AssistantCitations } from "@/features/assistant/components/AssistantCitations";
import type {
  AssistantAnswer,
  Citation,
  FeedbackRating,
} from "@/features/assistant/schemas";
import { cn } from "@/lib/utils";

/**
 * One assistant answer: the text, the FR-AI-05 caveat, FR-AI-03's citations, and
 * FR-FB-01's controls.
 *
 * **NFR-06 (OWASP LLM Top 10).** `answer` is model output and therefore
 * untrusted. It is rendered as a text node — never `dangerouslySetInnerHTML`,
 * never parsed as markdown, never fed to anything that would execute it. That is
 * the single most load-bearing line in this component and it looks like nothing.
 *
 * **NFR-07.** `dir` comes from the answer's own `language`, which the server
 * decides — not from re-sniffing the text in the browser. The prototype does
 * per-bubble bidi (`app-source.txt` 1334–1339) by testing the Unicode range of
 * the *question*; taking the server's answer means a reply that comes back in a
 * different language than it was asked in still renders correctly.
 *
 * This is **not** the Arabic translation layer. The surrounding chrome — the
 * composer, the filters, the shell — stays LTR. An Arabic answer will read
 * correctly inside an English page, which is honest about how far the bilingual
 * work has actually got.
 */

interface AssistantAnswerCardProps {
  answer: AssistantAnswer;
}

export const AssistantAnswerCard = ({ answer }: AssistantAnswerCardProps) => {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  /** Which rating this answer has been given, or `null` if none yet. */
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const feedback = useSubmitAssistantFeedback();

  const isArabic = answer.language === "ar";
  const isRated = rating !== null;

  /**
   * **One user act must produce exactly one record (NFR-12).**
   *
   * A first version posted the down-vote immediately *and* posted again when the
   * comment was sent, so "👎, here's why" wrote two rows and two audit events —
   * and FR-FB-02's ranked backlog would then have counted one complaint twice.
   * Repeated clicks on 👍 did the same thing once the first mutation settled.
   *
   * So a thumbs-down is **held** until the optional comment is settled, and both
   * ways out of that box submit once. The cost is that abandoning the box
   * records nothing — which is the right reading of an unsubmitted form, and
   * cheaper than the alternative, which needs a `PATCH` this contract has no
   * endpoint for.
   */
  const rate = (next: FeedbackRating) => {
    if (isRated || feedback.isPending) return;

    if (next === "down") {
      setRating("down");
      setShowComment(true);
      return;
    }

    feedback.mutate(
      { answer_id: answer.id, rating: "up" },
      { onSuccess: () => setRating("up") }
    );
  };

  /** Both buttons in the comment box land here — one mutation either way. */
  const sendDownVote = (body?: string) => {
    feedback.mutate(
      {
        answer_id: answer.id,
        rating: "down",
        ...(body ? { comment: body } : {}),
      },
      {
        onSuccess: () => {
          setComment("");
          setShowComment(false);
        },
        // Let them try again rather than stranding the answer as "rated" with
        // nothing recorded.
        onError: () => {
          setRating(null);
          setShowComment(false);
        },
      }
    );
  };

  const reportCitation = (citation: Citation) => {
    feedback.mutate({
      answer_id: answer.id,
      rating: "down",
      citation_record_id: citation.recordId,
    });
  };

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
      dir={isArabic ? "rtl" : "ltr"}
      lang={answer.language}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
          {isArabic ? "المساعد" : "Assistant"}
        </span>
      </div>

      {/*
        FR-AI-05 — "State clearly when confidence is low rather than risk an
        incorrect answer." The flag is decided server-side so every client draws
        the line in the same place; the UI's job is to make it impossible to miss,
        which means above the answer rather than beside it.
      */}
      {answer.lowConfidence ? (
        <p className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {isArabic
              ? "الثقة في هذه الإجابة منخفضة — تحقق من المصادر قبل الاعتماد عليها."
              : "Confidence in this answer is low — check the sources before relying on it."}
          </span>
        </p>
      ) : null}

      {/* NFR-06: a text node. Nothing here parses or executes model output. */}
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {answer.answer}
      </p>

      <AssistantCitations
        citations={answer.citations}
        language={answer.language}
        onReport={reportCitation}
        isReporting={feedback.isPending}
      />

      {/* FR-FB-01 — thumbs up/down with an optional comment. */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <span className="text-2xs text-muted-foreground">
          {isArabic ? "هل كانت هذه الإجابة مفيدة؟" : "Was this answer useful?"}
        </span>
        {/*
          `aria-pressed` because these hold state. Without it the only signal a
          rating landed is a toast that disappears, and the visual selected state
          would be colour alone — WCAG 1.4.1.
        */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-7", rating === "up" && "text-success")}
          aria-label="Rate this answer helpful"
          aria-pressed={rating === "up"}
          disabled={isRated || feedback.isPending}
          onClick={() => rate("up")}
        >
          <ThumbsUp className="size-3.5" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-7", rating === "down" && "text-destructive")}
          aria-label="Rate this answer not helpful"
          aria-pressed={rating === "down"}
          disabled={isRated || feedback.isPending}
          onClick={() => rate("down")}
        >
          <ThumbsDown className="size-3.5" aria-hidden />
        </Button>
      </div>

      {showComment ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`feedback-${answer.id}`} className="sr-only">
            What was wrong with this answer?
          </label>
          <Textarea
            id={`feedback-${answer.id}`}
            rows={2}
            placeholder="What was wrong with it? (optional)"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <div className="flex flex-wrap gap-2 self-end">
            {/*
              Both buttons submit, exactly once. "Skip" is not a cancel — the
              thumbs-down is the finding, and the comment is the optional part
              FR-FB-01 names.
            */}
            <Button
              type="button"
              variant="ghost"
              disabled={feedback.isPending}
              onClick={() => sendDownVote()}
            >
              Skip the comment
            </Button>
            <Button
              type="button"
              disabled={!comment.trim() || feedback.isPending}
              onClick={() => sendDownVote(comment.trim())}
            >
              Send feedback
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
