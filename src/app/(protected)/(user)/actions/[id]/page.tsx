import type { Metadata } from "next";

import { ActionDetail } from "@/features/actions/components/ActionDetail";

export const metadata: Metadata = { title: "Action detail" };

/**
 * §7.6 — one pending action. The prototype's `actionDetail` (1270–1319).
 *
 * `params` is a `Promise` in Next 16 — see
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`,
 * which records the change at v15.0.0-RC.
 *
 * The page is a server component that awaits the id and hands it down; the data
 * fetch lives in `ActionDetail`, which is a client component because the whole
 * screen reads Query and the session.
 */
export default async function ActionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ActionDetail actionId={id} />;
}
