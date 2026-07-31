import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { ShiftTimingsForm } from "@/features/admin/components/ShiftTimingsForm";

export const metadata: Metadata = { title: "Shift timings" };

/**
 * §7.2 / **FR-HOME-03**. The prototype's subtitle for this tab is *"Platform
 * configuration & shift timings"* (`app-source.txt` 1563); only the timings half
 * has a contract behind it, so only that half is claimed.
 */
export default function AdminShiftConfigPage() {
  return (
    <>
      <PageHeader
        title="Shift timings"
        description="When a shift opens and how long the handover overlap runs. Changing these moves the shift context on every dashboard and the window a generated summary covers."
      />
      <ShiftTimingsForm />
    </>
  );
}
