import type { z } from "zod";

import type {
  entryFiltersSchema,
  entryFormSchema,
  entryListSchema,
  entryScopeSchema,
} from "@/features/entries/schemas";

export type EntryList = z.infer<typeof entryListSchema>;
export type EntryFormValues = z.infer<typeof entryFormSchema>;
export type EntryFilters = z.infer<typeof entryFiltersSchema>;
export type EntryScope = z.infer<typeof entryScopeSchema>;
