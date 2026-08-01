import type { Metadata } from "next";

import { DashboardBuilderView } from "@/features/dashboard-builder/components/DashboardBuilderView";

export const metadata: Metadata = { title: "Edit dashboard" };

interface AdminDashboardBuilderEditPageProps {
  params: Promise<{ role: string }>;
}

/**
 * The prototype's `dashBuilder` (`app-source.txt` 2071–2098). ⚠️
 * PROTOTYPE-ONLY, see `features/dashboard-builder/schemas.ts`.
 */
export default async function AdminDashboardBuilderEditPage({
  params,
}: AdminDashboardBuilderEditPageProps) {
  const { role } = await params;

  return <DashboardBuilderView role={role} />;
}
