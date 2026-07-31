/**
 * Query keys for AI-suggested actions (FR-PA-01/02).
 *
 * A feature folder of its own, while the schemas stay in
 * `features/actions/schemas.ts` beside their `toSuggestion` mapper. That split
 * is deliberate: a suggestion is a *candidate* action and shares its vocabulary
 * (area, priority), but it has a different lifecycle, a different permission
 * (`action:confirm`) and a different endpoint. Folding it into `actionKeys`
 * would mean confirming a suggestion invalidates every action list, which is
 * both wasteful and misleading about what changed.
 *
 * `pending` is part of the key because `?pending=true` returns a genuinely
 * different set — the Supervisor's worklist versus the full history.
 */
export const suggestionKeys = {
  all: ["suggestions"] as const,
  lists: () => [...suggestionKeys.all, "list"] as const,
  list: (pendingOnly: boolean) =>
    [...suggestionKeys.lists(), { pendingOnly }] as const,
};
