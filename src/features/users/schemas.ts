import { z } from "zod";

import { paginatedSchema } from "@/lib/zod";
import { roleSchema, userSchema, userStatusSchema } from "@/types/user";

/** Response shapes — parsed at the boundary, never cast. */
export const userListSchema = paginatedSchema(userSchema);

export const userDetailSchema = userSchema;

/**
 * Validates the create/edit form and, unchanged, the request body it produces.
 * One schema, so the form and the API can never drift apart.
 */
export const userFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be 80 characters or fewer"),
  email: z.email("Enter a valid email address"),
  role: roleSchema,
  status: userStatusSchema,
});

export const userFiltersSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  search: z.string(),
  role: roleSchema.or(z.literal("all")),
  status: userStatusSchema.or(z.literal("all")),
});
