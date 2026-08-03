import type { ReactNode } from "react";

interface PageHeaderProps {
  /**
   * A `ReactNode` rather than a `string`, so a screen can put a status chip
   * *beside* its title the way the prototype does — "System Monitoring
   * ● Healthy" (`adminDashboard` 406). Pushed into `actions` instead, the chip
   * ends up at the far right of the page, detached from the thing it describes.
   *
   * Every existing caller passes a string, which still renders identically.
   */
  title: ReactNode;
  description?: string;
  /** Controls, right-aligned. Not the place for anything that labels the page. */
  actions?: ReactNode;
}

export const PageHeader = ({
  title,
  description,
  actions,
}: PageHeaderProps) => (
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="flex flex-col gap-1">
      <h1 className="flex flex-wrap items-center gap-3 text-xl font-semibold tracking-tight">
        {title}
      </h1>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
    {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
  </div>
);
