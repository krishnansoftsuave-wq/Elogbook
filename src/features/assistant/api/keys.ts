/**
 * Query keys for the assistant.
 *
 * The feature is **all mutations today** — asking a question is a `POST`, and so
 * is rating an answer — so nothing here is currently read by a `useQuery`. The
 * factory exists anyway, for the reason the repo bans inline key arrays: the
 * moment a conversation-history endpoint lands (§4 of the plan records that
 * there is none), `list()`/`detail()` belong here rather than being invented at
 * the call site.
 *
 * `answers` is what a query mutation invalidates if history ever becomes
 * server-owned. Until then the transcript is local component state, because
 * there is no endpoint to make it anything else.
 */
export const assistantKeys = {
  all: ["assistant"] as const,
  answers: () => [...assistantKeys.all, "answers"] as const,
};
