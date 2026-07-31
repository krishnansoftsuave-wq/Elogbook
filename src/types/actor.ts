import { z } from "zod";

/**
 * Whoever did a thing — raised an action, wrote a comment, exported a report.
 *
 * Two fields rather than one because they answer different questions:
 * `username` is the stable identity a backend joins on and the frontend
 * compares against the signed-in session, `display_name` is what a human reads.
 * The prototype stores only the display name (`by: 'A. Harthy'`,
 * app-source.txt 41), which cannot be compared to a session and breaks the
 * moment two people share a surname.
 *
 * PROVISIONAL field names, like every entity here. The nesting is the part
 * worth keeping: a flat `created_by` + `created_by_name` pair invites one of
 * them to be forgotten at a call site.
 */
export const actorWireSchema = z.object({
  username: z.string(),
  display_name: z.string(),
});

export const actorSchema = z.object({
  username: z.string(),
  displayName: z.string(),
});

export type ActorWire = z.infer<typeof actorWireSchema>;
export type Actor = z.infer<typeof actorSchema>;

export const toActor = (wire: ActorWire): Actor => ({
  username: wire.username,
  displayName: wire.display_name,
});
