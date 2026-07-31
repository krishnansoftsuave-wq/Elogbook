"use client";

import { useCallback, useRef, useState } from "react";
import { Bot, TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAskAssistant } from "@/features/assistant/api/mutations";
import { AssistantAnswerCard } from "@/features/assistant/components/AssistantAnswerCard";
import { AssistantComposer } from "@/features/assistant/components/AssistantComposer";
import type { AssistantAnswer } from "@/features/assistant/schemas";
import type { AssistantFilters } from "@/features/assistant/types";
import { getErrorMessage } from "@/lib/api-error";

/**
 * The assistant conversation — prototype `assistant()`, `app-source.txt`
 * 1322–1344.
 *
 * ## The transcript is local state, and that is a considered position
 *
 * There is **no conversation-history endpoint** in the Phase 0a contract — no
 * `GET /assistant/answers`, nothing to page through. So a transcript is not
 * server state, and putting it in TanStack Query would be inventing a cache for
 * a resource that does not exist. It is `useState`, it accumulates from mutation
 * results, and **it is gone on reload**.
 *
 * That is a real limitation and it is stated rather than hidden: persistence
 * needs a contract, and §7.13's audit trail records that a question was *asked*
 * (FR-OBS-01) without making the conversation retrievable.
 *
 * It is emphatically **not** Zustand. A conversation is neither session state nor
 * a user setting; it is the working state of one screen, which is exactly what
 * `useState` is for and what the state-ownership rule reserves it for.
 *
 * ## What the entry union buys
 *
 * A failed question stays visible as a failed question. Modelling the transcript
 * as a discriminated union rather than a list of answers means an error is a
 * *turn* — it sits under the question that caused it — instead of a toast that
 * vanishes and leaves an unanswered question on screen with no explanation.
 */

type TranscriptEntry =
  | { kind: "question"; id: string; text: string }
  | { kind: "answer"; id: string; answer: AssistantAnswer }
  | { kind: "pending"; id: string }
  | { kind: "error"; id: string; message: string };

const INITIAL_FILTERS: AssistantFilters = {
  equipment: "",
  area: "",
  author: "",
  dateFrom: "",
  dateTo: "",
};

/** Only non-empty filters are sent, so a cleared field is not an empty match. */
const toQueryValues = (question: string, filters: AssistantFilters) => ({
  question,
  ...(filters.equipment ? { equipment: filters.equipment } : {}),
  ...(filters.area ? { area: filters.area } : {}),
  ...(filters.author ? { author: filters.author } : {}),
  ...(filters.dateFrom ? { date_from: filters.dateFrom } : {}),
  ...(filters.dateTo ? { date_to: filters.dateTo } : {}),
});

export const AssistantChat = () => {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [filters, setFilters] = useState<AssistantFilters>(INITIAL_FILTERS);
  const ask = useAskAssistant();

  /*
    A counter, not `Date.now()` or `Math.random()`: this component renders on the
    server first, and either of those would produce a different value there than
    on the client, which React reports as a hydration mismatch. A ref starting at
    zero is identical in both.
  */
  const nextKey = useRef(0);
  const takeKey = () => {
    nextKey.current += 1;
    return `turn-${nextKey.current}`;
  };

  const setFilter = useCallback(
    <TKey extends keyof AssistantFilters>(
      key: TKey,
      value: AssistantFilters[TKey]
    ) => {
      setFilters((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const submit = (question: string) => {
    /*
      Both ids are taken *before* the updater runs. `takeKey` mutates a ref, and
      a state updater must be pure: `reactStrictMode` double-invokes it in
      development and React's eager-state path can invoke it again, so a
      `takeKey()` called inside would advance the counter more than once per
      question and hand the same entry a different key on a replay.
    */
    const questionId = takeKey();
    const pendingId = takeKey();

    setTranscript((current) => [
      ...current,
      { kind: "question", id: questionId, text: question },
      { kind: "pending", id: pendingId },
    ]);

    ask.mutate(toQueryValues(question, filters), {
      onSuccess: (answer) => {
        setTranscript((current) =>
          current.map((entry) =>
            entry.id === pendingId
              ? { kind: "answer", id: pendingId, answer }
              : entry
          )
        );
      },
      onError: (error) => {
        setTranscript((current) =>
          current.map((entry) =>
            entry.id === pendingId
              ? {
                  kind: "error",
                  id: pendingId,
                  message: getErrorMessage(error),
                }
              : entry
          )
        );
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex min-h-[18rem] flex-col gap-4"
        // The transcript grows while the user is elsewhere on the page; polite
        // means a screen reader finishes its sentence first.
        aria-live="polite"
        aria-busy={ask.isPending}
      >
        {transcript.length === 0 ? (
          <EmptyState
            icon={Bot}
            // Not "Ask the assistant" — that is the composer's label, and two
            // different things under one name is ambiguous to a screen reader
            // reading the page in order.
            title="No questions yet"
            description="Answers come from the shift logs, in English or Arabic, with the source records cited."
          />
        ) : (
          transcript.map((entry) => {
            switch (entry.kind) {
              case "question":
                return (
                  <p
                    key={entry.id}
                    className="self-end rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground max-sm:max-w-full sm:max-w-[80%]"
                  >
                    {entry.text}
                  </p>
                );

              case "pending":
                return (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
                  >
                    {/*
                      NFR-01 puts the answer under 3 seconds, so this is brief —
                      but it has to exist. The prototype waits 650ms showing
                      nothing at all, with the input still live, so a user cannot
                      tell a slow answer from an ignored question.
                    */}
                    <span className="sr-only">Waiting for an answer</span>
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                );

              case "error":
                return (
                  <p
                    key={entry.id}
                    // `alert` rather than relying on the container's polite
                    // region: a question that failed is the one thing on this
                    // screen worth interrupting for, and it is also what makes
                    // the failure addressable by a test.
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
                  >
                    <TriangleAlert
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden
                    />
                    <span>{entry.message}</span>
                  </p>
                );

              case "answer":
                return (
                  <AssistantAnswerCard key={entry.id} answer={entry.answer} />
                );
            }
          })
        )}
      </div>

      <AssistantComposer
        filters={filters}
        onFilterChange={setFilter}
        onSubmit={submit}
        isPending={ask.isPending}
      />
    </div>
  );
};
