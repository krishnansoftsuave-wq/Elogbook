"use client";

import Link from "next/link";
import { ExternalLink, ThumbsDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import type { Citation } from "@/features/assistant/schemas";
import { formatPlantTime, formatShiftDate } from "@/lib/datetime";

/**
 * **FR-AI-03**, verbatim: "Show **source proof** — shift date, timestamp (GST),
 * record ID — **with click-through to the original entry**."
 *
 * The prototype renders sources as flat unlinked strings (`app-source.txt` 1339)
 * — no record ID as such, no timestamp, nothing to click. It answers none of the
 * three clauses. This does all three.
 *
 * **Where a citation can and cannot link.** `targetType` decides:
 *
 * - `action` → `/actions/:id`, `summary` → `/summaries/:id`. Both exist because
 *   Phases 1a and 1b built them, which is why this screen came last.
 * - `log_entry` → the citation's own `sourceUrl`, when the backend supplies one.
 *   That record lives in the existing E-Logbook, which this platform reads and
 *   does not host (FR-DATA-01), so the link can only come from the payload.
 *
 * **§3.2 is not the obstacle**, and an earlier note here said it was. "No
 * development or modification" of the existing E-Logbook forbids *writing* to
 * it; a deep link is a read, and reads are the entire premise. The real obstacle
 * was that `citationWireSchema` had no field that could carry such a URL —
 * `source_url` now exists precisely so FR-AI-03's click-through is not
 * permanently half-met for the citation type the requirement most obviously
 * means.
 *
 * Until a backend supplies it, a `log_entry` renders as text with the reason
 * attached. A dead link would be worse than plain text, because it looks like it
 * works.
 *
 * **FR-FB-01** — "feedback on AI answers **and citations**". The per-citation
 * control is a thumbs-down only, and deliberately: "this source is wrong" is a
 * real, actionable finding that FR-FB-02 classifies as a retrieval miss, whereas
 * "this source is right" adds nothing the answer-level thumbs up does not
 * already say.
 */

interface AssistantCitationsProps {
  citations: readonly Citation[];
  /** `dir`-aware label — the prototype swaps this too (`app-source.txt` 1338). */
  language: "en" | "ar";
  onReport: (citation: Citation) => void;
  isReporting: boolean;
}

const SOURCES_LABEL = { en: "Sources", ar: "المصادر" } as const;

/** Where a citation opens, or `null` when nothing can be linked to. */
export const citationHref = (citation: Citation): string | null => {
  switch (citation.targetType) {
    case "action":
      return ROUTES.ACTION_DETAIL(citation.targetId);
    case "summary":
      return ROUTES.SUMMARY_DETAIL(citation.targetId);
    case "log_entry":
      // Source-system record: only the backend knows where it lives.
      return citation.sourceUrl ?? null;
  }
};

/** A source-system link leaves this app, so it opens out and is de-referrered. */
const isExternal = (citation: Citation): boolean =>
  citation.targetType === "log_entry" && Boolean(citation.sourceUrl);

export const AssistantCitations = ({
  citations,
  language,
  onReport,
  isReporting,
}: AssistantCitationsProps) => {
  if (citations.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      <p className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
        {SOURCES_LABEL[language]}
      </p>

      <ul className="flex flex-col gap-2">
        {citations.map((citation, index) => {
          const href = citationHref(citation);
          const proof = `${citation.recordId} · ${formatShiftDate(
            citation.shiftId.split("-")[0] ?? ""
          )} · ${formatPlantTime(citation.occurredAt)}`;

          return (
            <li
              // The record id alone is not a key: nothing in the contract makes
              // citations unique, and an answer citing two passages of one log
              // entry is ordinary. Duplicate keys break reconciliation of the
              // per-citation report button.
              key={`${index}-${citation.recordId}`}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
            >
              {href ? (
                <Link
                  href={href}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  {...(isExternal(citation)
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {citation.label}
                  {isExternal(citation) ? (
                    <>
                      <ExternalLink
                        className="ms-1 inline size-3 align-[-0.1em]"
                        aria-hidden
                      />
                      <span className="sr-only">(opens the source system)</span>
                    </>
                  ) : null}
                </Link>
              ) : (
                <span className="font-medium">{citation.label}</span>
              )}

              <span className="font-mono text-2xs text-muted-foreground">
                {proof}
              </span>

              {href ? null : (
                /*
                  Says why this one is not a link, rather than leaving it
                  looking like a link that failed to render.
                */
                <span className="text-2xs text-muted-foreground">
                  (source system — not held here)
                </span>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label={`Report ${citation.recordId} as an incorrect source`}
                disabled={isReporting}
                onClick={() => onReport(citation)}
              >
                <ThumbsDown className="size-3" aria-hidden />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
