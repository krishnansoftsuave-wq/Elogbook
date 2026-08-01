import type { Metadata } from "next";

import { DashboardPreview } from "@/features/dashboard-builder/components/DashboardPreview";

export const metadata: Metadata = { title: "Preview dashboard" };

interface AdminDashboardBuilderPreviewPageProps {
  params: Promise<{ role: string }>;
}

/**
 * The prototype's `dashPreview` (`app-source.txt` 2132–2142). ⚠️
 * PROTOTYPE-ONLY, see `features/dashboard-builder/schemas.ts`.
 */
export default async function AdminDashboardBuilderPreviewPage({
  params,
}: AdminDashboardBuilderPreviewPageProps) {
  const { role } = await params;

  return <DashboardPreview role={role} />;
}
