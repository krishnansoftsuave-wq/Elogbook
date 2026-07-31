import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/features/summaries/schemas";
import { cn } from "@/lib/utils";

/**
 * How serious one summary item is.
 *
 * **A label, never a bare coloured dot.** The prototype carries severity purely
 * in a hex — `'#C0392B'`, `'#D97706'` (app-source.txt 1414–1417) — which conveys
 * nothing to a reader who cannot distinguish those hues. WCAG 2.1 **1.4.1 Use of
 * Colour** is about exactly that, and it is a sighted-user requirement, so an
 * `aria-label` would not have answered it; the word has to be on screen.
 *
 * Tones reuse the vocabulary `StatusPill` established, including
 * `--priority-high`, which exists because the nearest chart token failed the 3:1
 * bar that WCAG 1.4.11 sets for non-text graphics.
 *
 * Lives in `src/components/` because `features/summaries` and `features/home`
 * both render it — the two-feature promotion rule.
 */

const SEVERITY_CLASS: Record<Severity, string> = {
  info: "bg-muted text-muted-foreground",
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning",
  high: "bg-priority-high/10 text-priority-high",
  critical: "bg-destructive/10 text-destructive",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  info: "Info",
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export const SeverityBadge = ({ severity, className }: SeverityBadgeProps) => (
  <Badge className={cn("shrink-0", SEVERITY_CLASS[severity], className)}>
    {SEVERITY_LABEL[severity]}
  </Badge>
);
