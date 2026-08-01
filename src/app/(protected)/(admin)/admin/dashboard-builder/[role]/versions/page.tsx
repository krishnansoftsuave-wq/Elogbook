import type { Metadata } from "next";

import { DashboardVersionsView } from "@/features/dashboard-builder/components/DashboardVersionsView";

export const metadata: Metadata = { title: "Publish & versions" };

interface AdminDashboardBuilderVersionsPageProps {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ published?: string }>;
}

/**
 * The prototype's `dashPublish` (`app-source.txt` 2178–2192). ⚠️
 * PROTOTYPE-ONLY, see `features/dashboard-builder/schemas.ts`.
 *
 * `?published=1` carries the "just published" signal from the Builder page's
 * Publish button, which navigates here on success — the only way this view
 * can show the banner for a publish that happened before it mounted.
 */
export default async function AdminDashboardBuilderVersionsPage({
  params,
  searchParams,
}: AdminDashboardBuilderVersionsPageProps) {
  const { role } = await params;
  const { published } = await searchParams;

  return (
    <DashboardVersionsView
      role={role}
      showPublishedBanner={published === "1"}
    />
  );
}
