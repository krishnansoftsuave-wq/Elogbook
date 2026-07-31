"use client";

import { useState } from "react";
import { Mic, Send, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { assistantQuerySchema } from "@/features/assistant/schemas";
import type { AssistantFilters } from "@/features/assistant/types";

/**
 * The composer — question, FR-AI-06's filters, and the voice control.
 *
 * ## The microphone is disabled, and the reason is not the header
 *
 * **FR-AI-01** confirms voice input for operators and supervisors, and
 * **FR-AI-07** puts "text and voice-input Q&A" in Phase-1 scope. It is not built,
 * for two independent reasons:
 *
 * 1. `next.config.ts` sets `Permissions-Policy: microphone=()`, which disables
 *    the microphone for the whole document. That file is guarded, and `DS-14.3`'s
 *    own note says the policy "must be narrowed **deliberately**, not silently
 *    widened" — an owner decision, taken this session as *not yet*.
 * 2. **The decisive one:** browser-native speech recognition cannot be used in
 *    this product at all. Chrome's `webkitSpeechRecognition` streams audio to
 *    Google's servers and Firefox does not implement it, while **NFR-05** is
 *    air-gapped with no egress and no cloud services. Narrowing the header would
 *    not have made this buildable.
 *
 * Real voice input here means `MediaRecorder` → an on-premises speech-to-text
 * service → text, and that service is **[BACKEND]** with no Phase 0a contract.
 *
 * So the control ships visibly disabled with the reason attached, the same
 * treatment FR-SUM-09's export got — and no worse than the prototype, whose mic
 * button has a tooltip and no handler at all (`app-source.txt` 1342).
 *
 * ⚠️ Note for whoever picks this up: `CLAUDE.md`, `.claude/rules/09` and the
 * checklist all record this collision as "DS-14.3 vs **FR-AI-04**". FR-AI-04 is
 * the *area* rule and has nothing to do with microphones — the voice requirement
 * is FR-AI-01. The two editable files are corrected; the signed checklist is not
 * edited to track reality, so its note stays wrong.
 */

const VOICE_UNAVAILABLE =
  "Voice input needs an on-premises speech-to-text service (FR-AI-01) — not available in this build.";

/** Hoisted: the composer re-renders on every keystroke (`DS-18.9`). */
const FILTER_FIELDS = [
  { key: "equipment", label: "Equipment", type: "text" },
  { key: "area", label: "Area", type: "text" },
  { key: "author", label: "Author", type: "text" },
  { key: "dateFrom", label: "From", type: "date" },
  { key: "dateTo", label: "To", type: "date" },
] as const;

interface AssistantComposerProps {
  filters: AssistantFilters;
  onFilterChange: <TKey extends keyof AssistantFilters>(
    key: TKey,
    value: AssistantFilters[TKey]
  ) => void;
  onSubmit: (question: string) => void;
  isPending: boolean;
}

export const AssistantComposer = ({
  filters,
  onFilterChange,
  onSubmit,
  isPending,
}: AssistantComposerProps) => {
  const [question, setQuestion] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState("");

  /**
   * Validated against the same schema the endpoint parses, so the 1000-character
   * cap is enforced where the user can still do something about it.
   *
   * A first version cleared the textarea unconditionally: a pasted 1,200-character
   * question vanished, the server answered 422, and the schema's own message —
   * "Question must be 1000 characters or fewer" — was never shown. The text is now
   * kept on failure, which is the whole point of validating before sending.
   */
  const submit = () => {
    const parsed = assistantQuerySchema.shape.question.safeParse(question);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a question");
      return;
    }
    if (isPending) return;

    setError("");
    onSubmit(parsed.data);
    setQuestion("");
  };

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      {/* FR-AI-06 — the user's own filters. Collapsed by default: a plain
          question is the common case, and five inputs above the composer would
          make the screen look like a search form rather than a conversation. */}
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={showFilters}
          aria-controls="assistant-filters"
          onClick={() => setShowFilters((open) => !open)}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          {showFilters ? "Hide filters" : "Filters"}
        </Button>

        <div
          id="assistant-filters"
          hidden={!showFilters}
          aria-hidden={!showFilters}
          className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FILTER_FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <label
                htmlFor={`assistant-${field.key}`}
                className="text-xs font-medium text-muted-foreground"
              >
                {field.label}
              </label>
              <Input
                id={`assistant-${field.key}`}
                type={field.type}
                value={filters[field.key]}
                onChange={(event) =>
                  onFilterChange(field.key, event.target.value)
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="assistant-question" className="sr-only">
            Ask the assistant
          </label>
          <Textarea
            id="assistant-question"
            rows={2}
            placeholder="Ask about logs, actions or equipment — in English or Arabic"
            aria-invalid={error !== ""}
            aria-describedby={error ? "assistant-question-error" : undefined}
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value);
              if (error) setError("");
            }}
            onKeyDown={(event) => {
              // Enter sends; Shift+Enter is a newline. A question long enough to
              // need two lines is exactly the kind FR-AI-06's filters exist for.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={VOICE_UNAVAILABLE}
          title={VOICE_UNAVAILABLE}
          disabled
        >
          <Mic aria-hidden />
        </Button>

        <Button
          type="button"
          size="icon"
          aria-label="Send question"
          disabled={!question.trim() || isPending}
          onClick={submit}
        >
          <Send aria-hidden />
        </Button>
      </div>

      {error ? (
        <p
          id="assistant-question-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <p className="text-2xs text-muted-foreground">{VOICE_UNAVAILABLE}</p>
    </div>
  );
};
