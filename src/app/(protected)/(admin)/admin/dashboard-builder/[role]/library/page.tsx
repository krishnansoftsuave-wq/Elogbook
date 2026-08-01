import type { Metadata } from "next";

import { WidgetLibraryView } from "@/features/dashboard-builder/components/WidgetLibraryView";

export const metadata: Metadata = { title: "Widget library" };

interface AdminDashboardBuilderLibraryPageProps {
  params: Promise<{ role: string }>;
}

/**
 * The prototype's `dashLibrary` (`app-source.txt` 2113–2131). ⚠️
 * PROTOTYPE-ONLY, see `features/dashboard-builder/schemas.ts`.
 */
export default async function AdminDashboardBuilderLibraryPage({
  params,
}: AdminDashboardBuilderLibraryPageProps) {
  const { role } = await params;

  return <WidgetLibraryView role={role} />;
}
