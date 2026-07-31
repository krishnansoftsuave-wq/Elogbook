"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGenerateSummary } from "@/features/summaries/api/mutations";
import { useCurrentShift } from "@/features/shifts/api/queries";

/**
 * **FR-SUM-02** — "Produce summaries both on demand and automatically at end of
 * every shift." This is the on-demand half; the scheduler is **[BACKEND]**.
 *
 * **FR-SUM-04** is why it is a single button with nothing after it: "Allow any
 * authorised user to create a summary **without a mandatory approval gate**."
 * There is no draft state, no reviewer, no submit-for-approval step to build.
 *
 * It generates for the **current** shift, whose id comes from
 * `GET /shifts/current` — so the button is disabled until that answer arrives
 * rather than guessing an id and posting a summary against the wrong shift.
 *
 * Pressing it twice is safe: the handler derives the summary id from the shift
 * and replaces in place, which is NFR-12's "no duplicate records". The
 * prototype's version instead prepends a new synthetic record each press
 * (`app-source.txt` 1435–1441), so three presses gave three summaries of one
 * shift.
 */
export const GenerateSummaryButton = () => {
  const { data: shift } = useCurrentShift();
  const generate = useGenerateSummary();

  return (
    <Button
      type="button"
      disabled={!shift || generate.isPending}
      onClick={() => {
        if (!shift) return;
        generate.mutate({ shift_id: shift.shiftId });
      }}
    >
      <Sparkles aria-hidden />
      {generate.isPending ? "Generating…" : "Generate summary"}
    </Button>
  );
};
