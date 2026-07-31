import type { z } from "zod";

import type {
  summaryCommentCreateSchema,
  summaryFiltersSchema,
  summaryGenerateSchema,
} from "@/features/summaries/schemas";

/**
 * Derived from the schemas, never written twice. The entity types themselves
 * (`Summary`, `SummarySection`, `SummaryComment`) are exported from `schemas.ts`
 * alongside their `to*` mappers, because a mapper and its return type belong in
 * one place.
 */
export type SummaryFilters = z.infer<typeof summaryFiltersSchema>;
export type SummaryCommentValues = z.infer<typeof summaryCommentCreateSchema>;
export type SummaryGenerateValues = z.infer<typeof summaryGenerateSchema>;
