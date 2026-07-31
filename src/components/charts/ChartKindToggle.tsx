"use client";

import { ChartColumnStacked, ChartPie } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The bar / pie switch that sits in a chart card's header — the prototype's
 * `chartSwitch` (app-source.txt 518–526).
 *
 * Requirement-backed independently of the prototype: BRD **§6.4** lists among
 * the Administrator's configuration duties the ability to *"switch insight chart
 * types such as pie/bar via a toggle"* **without development effort**.
 *
 * Cite **§6.4**, not FR-ADM-04 — FR-ADM-04 reads *"Allow OLNG to configure
 * measures, dashboards, assistant instructions, accuracy settings, and
 * retention"* and never mentions chart types. §6.4 is the only verbatim source.
 *
 * ⚠️ **Open question before this is wired to a screen.** §6.4 places the control
 * in the *Administrator's* duties, and **FR-DASH-04** caps regular users at
 * *"limited personalisation only"* — a closed list (hide, resize, save layout)
 * that does **not** include changing chart type. This component is role-agnostic
 * and unpersisted, which is fine for a primitive; dropping it on an Operator
 * dashboard card would diverge from FR-DASH-04.
 *
 * Three corrections to the prototype's version:
 *
 * - It renders `<button>` without `type`, which defaults to `submit` and would
 *   post any form the card ever sits inside. Every button here is
 *   `type="button"`.
 * - It signals the active kind with colour alone. This uses `aria-pressed`, so
 *   the state is announced rather than merely visible — and it keeps the
 *   accessible name stable, which a label that flipped would not.
 * - Material Icons (`bar_chart`, `donut_large`) become `lucide-react`.
 *
 * The icons are decorative: each button already carries its own visible text
 * label, so an `aria-hidden` icon beside it is the correct pairing — a second
 * accessible name would make the button announce itself twice.
 */

export const CHART_KINDS = ["bar", "pie"] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

const META: Record<ChartKind, { label: string; icon: LucideIcon }> = {
  bar: { label: "Bar", icon: ChartColumnStacked },
  pie: { label: "Pie", icon: ChartPie },
};

interface ChartKindToggleProps {
  value: ChartKind;
  onChange: (kind: ChartKind) => void;
  /** Which kinds this card offers. Defaults to both. */
  kinds?: readonly ChartKind[];
  /**
   * Names the group for assistive technology — "Chart type for pending actions
   * by status". Several of these can share a screen, so "Chart type" alone
   * would be ambiguous.
   */
  label: string;
  className?: string;
}

export const ChartKindToggle = ({
  value,
  onChange,
  kinds = CHART_KINDS,
  label,
  className,
}: ChartKindToggleProps) => (
  <div
    // A group rather than a radiogroup: `aria-pressed` buttons are the simpler
    // pattern and do not require the arrow-key roving focus a radiogroup owes.
    role="group"
    aria-label={label}
    className={cn(
      "inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5",
      className
    )}
  >
    {kinds.map((kind) => {
      const { label: kindLabel, icon: Icon } = META[kind];
      const active = kind === value;

      return (
        <button
          key={kind}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(kind)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            active
              ? "bg-card text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {kindLabel}
        </button>
      );
    })}
  </div>
);
