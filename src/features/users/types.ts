import type { z } from "zod";

import type {
  userAccessUpdateSchema,
  userFiltersSchema,
} from "@/features/users/schemas";

/**
 * Derived from the schemas, never written twice. The entity type (`User`) is
 * exported from `types/user.ts` alongside its `toUser` mapper, because it is
 * shared with the auth layer rather than owned by this feature.
 */
export type UserFilters = z.infer<typeof userFiltersSchema>;
export type UserAccessValues = z.infer<typeof userAccessUpdateSchema>;
