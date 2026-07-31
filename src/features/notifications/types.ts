import type { z } from "zod";

import type { notificationFiltersSchema } from "@/features/notifications/schemas";

/**
 * Derived from the schema, never written twice. The entity type (`Notification`)
 * is exported from `schemas.ts` alongside its `toNotification` mapper.
 */
export type NotificationFilters = z.infer<typeof notificationFiltersSchema>;
