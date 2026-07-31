import type { z } from "zod";

import type { auditFiltersSchema } from "@/features/audit/schemas";

/**
 * Derived from the schema, never written twice. `AuditEvent` and its
 * `toAuditEvent` mapper live in `schemas.ts` alongside the wire shape.
 */
export type AuditFilters = z.infer<typeof auditFiltersSchema>;
