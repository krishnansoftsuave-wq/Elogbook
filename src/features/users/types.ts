import type { z } from "zod";

import type {
  userFiltersSchema,
  userFormSchema,
  userListSchema,
} from "@/features/users/schemas";

export type UserList = z.infer<typeof userListSchema>;
export type UserFormValues = z.infer<typeof userFormSchema>;
export type UserFilters = z.infer<typeof userFiltersSchema>;
