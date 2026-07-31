import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { Dashboard } from "@/features/home/components/Dashboard";

export const metadata: Metadata = { title: "Operations dashboard" };

/**
 * §7.2 — the role-based dashboard **FR-AUTH-01** redirects to.
 *
 * `Dashboard` carries the full account of what is built here and what is
 * deliberately not, including why the prototype's `specDashboard()` was not
 * ported.
 */
export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Operations dashboard"
        description="Current-shift highlights across the whole plant."
      />
      <Dashboard />
    </>
  );
}
