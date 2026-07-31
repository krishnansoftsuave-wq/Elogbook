import type { z } from "zod";

import type {
  assistantFeedbackCreateSchema,
  assistantQuerySchema,
} from "@/features/assistant/schemas";

/**
 * Derived from the schemas, never written twice. The entity types
 * (`AssistantAnswer`, `Citation`) are exported from `schemas.ts` alongside their
 * `to*` mappers, because a mapper and its return type belong in one place.
 */
export type AssistantQueryValues = z.infer<typeof assistantQuerySchema>;
export type AssistantFeedbackValues = z.infer<
  typeof assistantFeedbackCreateSchema
>;

/** The user's own filters (FR-AI-06), as the composer holds them. */
export interface AssistantFilters {
  equipment: string;
  area: string;
  author: string;
  dateFrom: string;
  dateTo: string;
}
