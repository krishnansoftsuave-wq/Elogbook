import type { z } from "zod";

import type {
  devTokenRequestSchema,
  sessionUserSchema,
} from "@/features/auth/schemas";

/** What the rest of the app reads. */
export type SessionUser = z.infer<typeof sessionUserSchema>;

export type DevTokenRequest = z.infer<typeof devTokenRequestSchema>;
