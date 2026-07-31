"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { API_ENDPOINTS } from "@/constants/api";
import {
  assistantAnswerResponseSchema,
  assistantFeedbackResponseSchema,
  toAssistantAnswer,
} from "@/features/assistant/schemas";
import type {
  AssistantFeedbackValues,
  AssistantQueryValues,
} from "@/features/assistant/types";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/api-error";

/**
 * **FR-AI-01** — ask a question, in English or Arabic, and get the answer back
 * in the language asked.
 *
 * A **mutation**, not a query, and the distinction is not pedantic: a question
 * is a command with a side effect (`recordAudit`, FR-OBS-01 — "every question is
 * audited"), asking the same thing twice is meaningful rather than wasteful, and
 * there is no cache key a conversation turn would sensibly live under. Wrapping
 * it in `useQuery` would dedupe two identical questions into one audited event.
 *
 * **NFR-01** — "Chatbot response latency under 3 seconds." Nothing here blocks:
 * `isPending` drives a placeholder in the transcript, so the composer stays live
 * and the user can see that something is happening.
 *
 * **The global error toast is opted out of, explicitly.** The failure belongs in
 * the transcript, under the question that caused it — a toast disappears and
 * leaves an unanswered question on screen with nothing to explain it.
 *
 * `meta: { suppressErrorToast: true }` is the mechanism, and it is required
 * rather than optional. `lib/query-client.ts:23` skips the global toast only
 * when `mutation.options.onError` is set, and a per-call `mutate(vars, {
 * onError })` callback — which is how `AssistantChat` writes its error turn —
 * lives on the *observer*, never on `mutation.options`. Without this line the
 * user sees the same sentence twice: once in a toast and once inline.
 */
export const useAskAssistant = () =>
  useMutation({
    mutationFn: async (values: AssistantQueryValues) => {
      const response = await api.post(API_ENDPOINTS.ASSISTANT.QUERY, values);
      return toAssistantAnswer(
        assistantAnswerResponseSchema.parse(response.data).data
      );
    },
    meta: { suppressErrorToast: true },
  });

/**
 * **FR-FB-01** — "Capture user feedback on AI answers and citations (thumbs
 * up/down with an optional comment)."
 *
 * Nothing is invalidated because nothing reads it back: §7.13 is explicit that
 * the loop is "human-gated — nothing changes autonomously", so submitting
 * feedback must not alter the answer on screen. The acknowledgement is the whole
 * user-visible effect, and it is deliberately modest — thanking someone for a
 * thumbs-down and then changing nothing would misrepresent what happened.
 */
export const useSubmitAssistantFeedback = () =>
  useMutation({
    mutationFn: async (values: AssistantFeedbackValues) => {
      const response = await api.post(API_ENDPOINTS.ASSISTANT.FEEDBACK, values);
      return assistantFeedbackResponseSchema.parse(response.data).data;
    },
    onSuccess: () => {
      toast.success("Thanks — your feedback was recorded");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
