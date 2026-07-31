import type { Metadata } from "next";

import { SummaryDetail } from "@/features/summaries/components/SummaryDetail";

export const metadata: Metadata = { title: "Shift summary" };

/**
 * §7.5 — one shift summary. The prototype's `summaryDetail` (1392–1434), which
 * has no route of its own there: it is reached by setting `state.selSummary`
 * (1367), so a summary cannot be linked or bookmarked. This is that fix.
 *
 * `params` is a `Promise` in Next 16 — see
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`,
 * which records the change at v15.0.0-RC.
 */
export default async function SummaryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <SummaryDetail summaryId={id} />;
}
