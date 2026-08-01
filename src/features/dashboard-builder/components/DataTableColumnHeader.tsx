import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The prototype's table header cell (`app-source.txt` 2049): uppercase,
 * letter-spaced, muted — the one visual departure from `components/ui/table`'s
 * default `TableHead` this feature makes, scoped to its own column headers via
 * `columnHelper`'s `header` rather than touching the shared primitive every
 * other table in the app already renders unstyled.
 */
export const DataTableColumnHeader = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "text-[0.65625rem] font-semibold tracking-wider text-muted-foreground uppercase",
      className
    )}
  >
    {children}
  </span>
);
