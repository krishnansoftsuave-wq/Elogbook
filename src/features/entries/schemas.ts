import { z } from "zod";

import { paginatedSchema } from "@/lib/zod";
import { entrySchema, entryStatusSchema } from "@/types/entry";

/** Response shapes — parsed at the boundary, never cast. */
export const entryListSchema = paginatedSchema(entrySchema);

export const entryDetailSchema = entrySchema;

/**
 * Validates the create/edit form and, unchanged, the request body it produces.
 * `performedAt` is a date-only string because the form uses `<input type="date">`.
 */
export const entryFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title must be 120 characters or fewer"),
  body: z
    .string()
    .trim()
    .min(10, "Describe what happened in at least 10 characters")
    .max(5000, "Entry must be 5000 characters or fewer"),
  performedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date this took place"),
  status: entryStatusSchema.exclude(["signed"]),
});

/** `scope` selects which of the two logbook panels is being listed. */
export const entryScopeSchema = z.enum(["mine", "pending"]);

export const entryFiltersSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  search: z.string(),
  status: entryStatusSchema.or(z.literal("all")),
  scope: entryScopeSchema,
});
