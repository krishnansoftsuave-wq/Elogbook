import type { Metadata } from "next";

import { Dashboard } from "@/features/home/components/Dashboard";

/**
 * Static, and therefore the *route's* name rather than either variant's. An
 * Administrator's tab reads "Operations dashboard" while the page says "System
 * monitoring" — the alternative is `generateMetadata` reading a session the
 * server does not have, since the role lives behind the auth token.
 */
export const metadata: Metadata = { title: "Operations Dashboard" };

/**
 * §7.2 — the role-based dashboard **FR-AUTH-01** redirects to.
 *
 * `Dashboard` carries the full account of what is built here and what is
 * deliberately not, including why the prototype's `specDashboard()` was not
 * ported.
 */
export default function DashboardPage() {
  /*
    No `PageHeader` here. This route renders one of two different screens
    (§6.4), and a fixed header printed "Operations dashboard · Current-shift
    highlights across the whole plant" above an Administrator's telemetry board.
    Each variant names itself.
  */
  return <Dashboard />;
}
