import { z } from "zod";

import { envelopeSchema, paginatedSchema } from "@/lib/zod";
import { roleSchema, userStatusSchema, userWireSchema } from "@/types/user";

/**
 * The admin directory — **FR-ADM-01**, read as a mirror of AD. `types/user.ts`
 * records why the record has the shape it does.
 */

export const userListResponseSchema = envelopeSchema(
  paginatedSchema(userWireSchema)
);
export const userDetailResponseSchema = envelopeSchema(userWireSchema);

/**
 * What an Administrator may change about a person: **their platform access, and
 * nothing else.**
 *
 * `display_name`, `ad_groups` and `roles` are deliberately absent. **FR-AUTH-02**
 * governs group-to-role mapping "via the OLNG AD admin", and §9.1 has the
 * Administrator configure that *mapping* rather than assign roles per user — so
 * a per-user roles field here would let this screen contradict the directory it
 * is mirroring. The handler rejects them rather than ignoring them, so a client
 * that tries learns why.
 *
 * ⚠️ **Narrower than the approved plan**, which had this accept `{ roles?,
 * status? }`. Writing it made the FR-AUTH-02 reading above unavoidable: roles
 * follow from AD groups, and the screen that changes them is the group→role
 * mapping in Phase 3c. Reported rather than quietly widened back.
 */
export const userAccessUpdateSchema = z
  .strictObject({
    status: userStatusSchema,
  })
  /*
    Strict, not stripping. A plain `z.object` would silently discard a `roles`
    key and answer 200, so a client editing AD's data would believe it had
    worked. Refusing names the field in the 422 instead.
  */
  .describe(
    "Platform access only — display name, AD groups and roles are AD's"
  );

export const userFiltersSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  search: z.string(),
  /**
   * Matches a person holding this role among possibly several — FR-AUTH-03's
   * multi-role case means this is a contains, not an equals.
   */
  role: roleSchema.or(z.literal("all")),
  status: userStatusSchema.or(z.literal("all")),
});
