import { z } from "zod";

export const entryStatusSchema = z.enum(["draft", "submitted", "signed"]);

/** Who an entry is waiting on, derived from its status. */
export const entrySchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  status: entryStatusSchema,
  /** Id of the member who wrote it. */
  authorId: z.string(),
  authorName: z.string(),
  /** Set once a supervisor signs it off. */
  signedBy: z.string().nullable(),
  signedAt: z.iso.datetime().nullable(),
  performedAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});

export type Entry = z.infer<typeof entrySchema>;
export type EntryStatus = z.infer<typeof entryStatusSchema>;
