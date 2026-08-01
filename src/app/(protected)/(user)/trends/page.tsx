import type { Metadata } from "next";

import { TrendsScreen } from "@/features/trends/components/TrendsScreen";

export const metadata: Metadata = { title: "Trends & KPIs" };

/**
 * §7.7 — Trends & KPIs (**FR-AN-02**), and the trend half of **FR-REP-01**. The
 * prototype's `trends` screen (`app-source.txt` 1876–1982).
 *
 * Unlike `SummariesPage`/`ActionsPage`, `PageHeader` does not live here: its
 * `description` is shift-aware (`useCurrentShift()`), and a server component
 * cannot call a hook. So this file stays a server component whose only job is
 * the real `<title>` via `metadata` — every hook, the period state, the
 * `useTrends` query, and the loading/403/error/success branch live in
 * `TrendsScreen`, the client component below.
 */
export default function TrendsPage() {
  return <TrendsScreen />;
}
