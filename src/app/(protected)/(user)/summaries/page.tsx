import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { GenerateSummaryButton } from "@/features/summaries/components/GenerateSummaryButton";
import { SummariesTable } from "@/features/summaries/components/SummariesTable";

export const metadata: Metadata = { title: "Shift summaries" };

/**
 * §7.5 — the shift-summary list. The prototype's `summary` screen
 * (`app-source.txt` 1365–1390).
 *
 * The prototype's subtitle is "All generated shift summaries across the system ·
 * 24 total" (1373) — a hardcoded count, and wrong: its own array holds 14. The
 * real total is on the pagination row, from the response.
 */
export default function SummariesPage() {
  return (
    <>
      <PageHeader
        title="Shift summaries"
        description="Generated handover summaries across the whole plant."
        actions={<GenerateSummaryButton />}
      />
      <SummariesTable />
    </>
  );
}
