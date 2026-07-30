import { z } from "zod";

import { ROLE_VALUES } from "@/constants/roles";

export const roleSchema = z.enum(ROLE_VALUES);

export const userStatusSchema = z.enum(["active", "invited", "suspended"]);

/**
 * A user record in the admin directory. Distinct from `SessionUser` in
 * `features/auth`, which is the signed-in identity `GET /me` returns: that one
 * carries `roles` (plural) plus permissions and area scope, this one is a row
 * an administrator edits.
 */
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: roleSchema,
  status: userStatusSchema,
  createdAt: z.iso.datetime(),
});

export type User = z.infer<typeof userSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
