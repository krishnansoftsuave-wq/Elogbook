import { z } from "zod";

/**
 * Shape every list endpoint returns. Wrap an item schema with this rather than
 * redeclaring `total`/`page` in each feature.
 */
export const paginatedSchema = <TItem extends z.ZodTypeAny>(item: TItem) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });

export type Paginated<TItem> = {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * `meta` rides along with every response, success or error
 * (`authentication_flow.md` §3). `correlation_id` is the same ID the backend
 * logs, so it is the fastest way to tie a bug report to a server trace.
 */
export const apiMetaSchema = z.object({
  correlation_id: z.string(),
  timestamp: z.string(),
});

/**
 * The §3 success envelope: `{ success: true, data, meta }`.
 *
 * Unwrapping stays explicit at each query hook. An axios response interceptor
 * that unwrapped `data` globally would hide the raw error body from
 * `getErrorMessage`, and would break the `users`/`entries` features, which read
 * bare bodies from a different backend.
 */
export const envelopeSchema = <TData extends z.ZodTypeAny>(data: TData) =>
  z.object({
    success: z.literal(true),
    data,
    meta: apiMetaSchema,
  });

/**
 * The §3 error envelope. `details` is `null` in every documented example and
 * the contract never pins its shape, so it stays unknown until parsed by
 * whoever actually reads it — see `getFieldErrors`.
 */
export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().nullable(),
  }),
  meta: apiMetaSchema,
});

export type ApiMeta = z.infer<typeof apiMetaSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;

export const paginationParamsSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type PaginationParams = z.infer<typeof paginationParamsSchema>;

/**
 * Flattens a ZodError into `field -> first message`, which is the shape forms
 * and toasts both want.
 */
export const fieldErrorsFromZod = (error: z.ZodError): Record<string, string> =>
  error.issues.reduce<Record<string, string>>((acc, issue) => {
    const path = issue.path.join(".");
    if (path && !acc[path]) acc[path] = issue.message;
    return acc;
  }, {});
