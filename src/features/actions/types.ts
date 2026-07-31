import type { z } from "zod";

import type {
  actionAssignSchema,
  actionCommentCreateSchema,
  actionFiltersSchema,
  actionStatusUpdateSchema,
  suggestionConfirmSchema,
} from "@/features/actions/schemas";

/**
 * Derived from the schemas, never written twice. The entity types themselves
 * (`Action`, `Suggestion`, `ActionComment`) are exported from `schemas.ts`
 * alongside their `to*` mappers, because a mapper and its return type belong in
 * one place.
 */
export type ActionFilters = z.infer<typeof actionFiltersSchema>;
export type ActionStatusUpdate = z.infer<typeof actionStatusUpdateSchema>;
export type ActionCommentValues = z.infer<typeof actionCommentCreateSchema>;
export type ActionAssignValues = z.infer<typeof actionAssignSchema>;
export type SuggestionConfirmValues = z.infer<typeof suggestionConfirmSchema>;
