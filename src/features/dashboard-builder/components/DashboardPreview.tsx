"use client";

import Link from "next/link";
import { ChevronDown, Eye, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABEL } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { usePublishDashboard } from "@/features/dashboard-builder/api/mutations";
import { useDashboardConfig } from "@/features/dashboard-builder/api/queries";
import type {
  DashboardBuilderWidget,
  DashboardBuilderWidgetType,
  LayoutColumns,
} from "@/features/dashboard-builder/schemas";
import { formatPlantDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

const WIDGET_TYPE_CHIP: Record<DashboardBuilderWidgetType, string> = {
  kpi: "KPI",
  list: "LIST",
  summary: "SUMMARY",
  table: "TABLE",
  line: "LINE",
  bar: "BAR",
  pie: "PIE",
  text: "TEXT",
};

/** `wcard('Shift KPIs', ...)`'s `kpi(...)` calls — `app-source.txt:2158`. */
const ShiftKpisPreview = () => (
  <div className="flex flex-col gap-3.5">
    <div>
      <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
        Open actions
      </p>
      <p className="text-2xl font-bold">12</p>
    </div>
    <div>
      <p className="text-[10px] tracking-wide text-destructive uppercase">
        Overdue
      </p>
      <p className="text-2xl font-bold text-destructive">3</p>
    </div>
    <div>
      <p className="text-[10px] tracking-wide text-amber-700 uppercase dark:text-amber-500">
        Critical alarms
      </p>
      <p className="text-2xl font-bold text-amber-700 dark:text-amber-500">5</p>
    </div>
    <div>
      <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
        Safety obs.
      </p>
      <p className="text-2xl font-bold">2</p>
    </div>
  </div>
);

/** The alarm rows in `wcard('Critical Alarms', ...)` — `app-source.txt:2159`. */
const CRITICAL_ALARMS_PREVIEW = [
  {
    label: "Compressor trip — B-train",
    time: "02:14",
    severity: "critical" as const,
  },
  { label: "High temp — P-204", time: "04:38", severity: "critical" as const },
  { label: "Low flow — FT-330", time: "09:12", severity: "warning" as const },
];

const CriticalAlarmsPreview = () => (
  <div className="flex flex-col gap-2.5">
    {CRITICAL_ALARMS_PREVIEW.map((alarm) => (
      <div key={alarm.label} className="flex items-center gap-2 text-xs">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            alarm.severity === "critical" ? "bg-destructive" : "bg-amber-600"
          )}
          aria-hidden
        />
        <span className="flex-1">{alarm.label}</span>
        <span className="text-muted-foreground tabular-nums">{alarm.time}</span>
      </div>
    ))}
  </div>
);

/**
 * `wcard('Actions by Area', ...)`'s bar rows — `app-source.txt:2160`. Values
 * are fixed prototype constants, so each bar's fill width is a static
 * Tailwind class computed once here rather than an inline `style` (ESLint
 * bans it — `01-code-quality.md`).
 */
const ACTIONS_BY_AREA_PREVIEW = [
  { label: "B-train", value: 9, widthClass: "w-full" },
  { label: "Unit 3", value: 6, widthClass: "w-2/3" },
  { label: "Utilities", value: 4, widthClass: "w-[44%]" },
] as const;

const ActionsByAreaPreview = () => (
  <div className="flex flex-col gap-2.5">
    {ACTIONS_BY_AREA_PREVIEW.map((area) => (
      <div key={area.label}>
        <div className="mb-1 flex justify-between text-[11.5px]">
          <span>{area.label}</span>
          <span className="text-muted-foreground">{area.value}</span>
        </div>
        <div className="h-1.5 rounded bg-muted">
          <div className={cn("h-1.5 rounded bg-primary", area.widthClass)} />
        </div>
      </div>
    ))}
  </div>
);

/** `wcard('Repeating Issues', ...)`'s count-chip rows — `app-source.txt:2163`. */
const REPEATING_ISSUES_PREVIEW = [
  { count: "×4", label: "P-204 high temperature" },
  { count: "×3", label: "FT-330 low flow" },
];

const RepeatingIssuesPreview = () => (
  <div className="flex flex-col gap-2.5">
    {REPEATING_ISSUES_PREVIEW.map((issue) => (
      <div key={issue.label} className="flex items-center gap-2 text-xs">
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
          {issue.count}
        </span>
        <span>{issue.label}</span>
      </div>
    ))}
  </div>
);

/** `wcard('Previous Shift Summary Report · ...', ...)` — `app-source.txt:2162`. */
const PreviousShiftSummaryPreview = () => (
  <p className="text-xs leading-relaxed text-muted-foreground">
    5 activities · 4 critical alarms · 9 pending actions · 1 safety observation.
    Compressor trip handled; XV-118 inspection carried over.
  </p>
);

/**
 * Generic, type-only fallback for widgets the prototype's `dashPreview`
 * never renders explicitly (only `dashLibrary`'s card grid does —
 * `app-source.txt:2133`, `dashWidgetPreview`). Kept as an approximation for
 * every widget outside the fixed Shift Overview set above.
 */
const GenericWidgetPreview = ({
  type,
}: {
  type: DashboardBuilderWidgetType;
}) => {
  if (type === "kpi") return <ShiftKpisPreview />;

  if (type === "bar" || type === "line") {
    // Fixed set of heights, so Tailwind's static `h-*` scale covers every
    // bar without an inline `style` (ESLint bans it — `01-code-quality.md`).
    const BAR_HEIGHTS = ["h-10", "h-14", "h-8", "h-16", "h-12"] as const;
    return (
      <div className="flex h-16 items-end gap-1.5">
        {BAR_HEIGHTS.map((heightClass, index) => (
          <div
            key={index}
            className={cn("w-4 rounded-t bg-primary/70", heightClass)}
          />
        ))}
      </div>
    );
  }

  if (type === "pie") {
    return (
      <svg
        viewBox="0 0 40 40"
        className="size-11"
        role="img"
        aria-label="65 percent"
      >
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          strokeWidth="8"
          className="stroke-muted"
        />
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          strokeWidth="8"
          strokeDasharray={`${0.65 * 2 * Math.PI * 16} ${2 * Math.PI * 16}`}
          transform="rotate(-90 20 20)"
          className="stroke-primary"
        />
      </svg>
    );
  }

  if (type === "table" || type === "list") {
    return (
      <div className="flex w-full flex-col gap-1.5">
        {["P-204", "FT-330", "XV-118"].map((label) => (
          <div
            key={label}
            className="flex justify-between border-b pb-1 text-xs text-muted-foreground"
          >
            <span>{label}</span>
            <span>×2</span>
          </div>
        ))}
      </div>
    );
  }

  if (type === "summary") {
    return (
      <p className="text-xs text-muted-foreground">
        5 activities · 4 critical alarms · 9 pending actions.
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground italic">
      Free-text handover notes…
    </p>
  );
};

/**
 * The widget bodies `dashPreview` hardcodes per **label**, not just type
 * (`app-source.txt:2158–2163`) — e.g. two different `list` widgets
 * ("Critical Alarms" vs a generic list) render different content there.
 * Falls back to `GenericWidgetPreview` for every widget outside that set.
 */
const WidgetPlaceholder = ({ widget }: { widget: DashboardBuilderWidget }) => {
  switch (widget.label) {
    case "Shift KPIs":
      return <ShiftKpisPreview />;
    case "Critical Alarms":
      return <CriticalAlarmsPreview />;
    case "Actions by Area":
      return <ActionsByAreaPreview />;
    case "Repeating Issues":
      return <RepeatingIssuesPreview />;
    case "Previous Shift Summary Report":
      return <PreviousShiftSummaryPreview />;
    default:
      return <GenericWidgetPreview type={widget.type} />;
  }
};

const gridColsClass: Record<LayoutColumns, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

interface DashboardPreviewProps {
  role: string;
}

/**
 * The prototype's `dashPreview` (`app-source.txt` 2132–2142) — a read-only
 * render of exactly what the target role would see. ⚠️ PROTOTYPE-ONLY, see
 * `features/dashboard-builder/schemas.ts`.
 */
export const DashboardPreview = ({ role }: DashboardPreviewProps) => {
  const { data: config, isLoading } = useDashboardConfig(role);
  const publish = usePublishDashboard();

  if (isLoading || !config) {
    return <Skeleton className="h-96 w-full" />;
  }

  const roleLabel = ROLE_LABEL[config.role] ?? config.role;
  const visibleWidgets = config.widgets.filter((widget) => widget.enabled);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <Eye className="size-4 shrink-0" aria-hidden />
        <span className="min-w-60 flex-1">
          <strong>Preview mode</strong> — this is exactly what {roleLabel}s see.
          Read-only; no widgets can be edited here.
        </span>
        <span className="text-xs">Viewing as</span>
        {/* Read-only display, matching the prototype's own chip — it has no
            `onClick` there either (`app-source.txt:2152`); switching role
            happens by navigating to that role's builder, not from here. */}
        <span className="inline-flex items-center gap-1 rounded-md border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground">
          {roleLabel}
          <ChevronDown
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </span>
        <Link href={ROUTES.ADMIN.DASHBOARD_BUILDER.EDIT(role)}>
          <Button type="button" variant="outline" size="sm">
            Exit preview
          </Button>
        </Link>
        <Button
          type="button"
          size="sm"
          disabled={publish.isPending}
          onClick={() => publish.mutate(role)}
        >
          <Upload aria-hidden />
          Publish
        </Button>
      </div>

      <h2 className="w-fit border-b-2 border-primary pb-1.5 text-sm font-semibold text-primary">
        {config.name}
      </h2>

      <div
        className={cn(
          "grid grid-cols-1 gap-3.5",
          gridColsClass[config.layoutColumns]
        )}
      >
        {visibleWidgets.map((widget: DashboardBuilderWidget) => (
          <div
            key={widget.id}
            className="overflow-hidden rounded-lg border bg-card"
          >
            <div className="flex items-center justify-between border-b px-3.5 py-2.5">
              <span className="text-sm font-semibold">
                {widget.label === "Previous Shift Summary Report" &&
                config.lastPublishedAt
                  ? `${widget.label} · ${formatPlantDateTime(config.lastPublishedAt)}`
                  : widget.label}
              </span>
              <span className="text-[9.5px] font-bold tracking-wide text-muted-foreground">
                {WIDGET_TYPE_CHIP[widget.type]}
              </span>
            </div>
            <div className="p-3.5">
              <WidgetPlaceholder widget={widget} />
            </div>
          </div>
        ))}
        {visibleWidgets.length === 0 ? (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            No widgets are enabled on this dashboard.
          </p>
        ) : null}
      </div>
    </div>
  );
};
