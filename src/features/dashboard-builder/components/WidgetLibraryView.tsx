"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABEL } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import {
  useDashboardConfig,
  useDashboardLibrary,
} from "@/features/dashboard-builder/api/queries";
import { useSaveDashboardDraft } from "@/features/dashboard-builder/api/mutations";
import {
  LIBRARY_CATEGORIES,
  type DashboardBuilderWidget,
  type LibraryWidget,
} from "@/features/dashboard-builder/schemas";
import { cn } from "@/lib/utils";

const ALL_CATEGORIES = "All widgets";

const nextWidgetOrder = (widgets: readonly DashboardBuilderWidget[]): number =>
  widgets.length === 0 ? 0 : Math.max(...widgets.map((w) => w.order)) + 1;

interface WidgetLibraryViewProps {
  role: string;
}

/**
 * The prototype's `dashLibrary` (`app-source.txt` 2113–2131) — a dedicated
 * page, not an overlay: breadcrumb, category sidebar, 3-column widget card
 * grid, "Back to builder" / "Done" actions. ⚠️ PROTOTYPE-ONLY, see
 * `features/dashboard-builder/schemas.ts`.
 */
export const WidgetLibraryView = ({ role }: WidgetLibraryViewProps) => {
  const router = useRouter();
  const { data: config, isLoading: configLoading } = useDashboardConfig(role);
  const { data: library, isLoading: libraryLoading } =
    useDashboardLibrary(role);
  const saveDraft = useSaveDashboardDraft();
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (library ?? []).filter(
      (widget) =>
        (category === ALL_CATEGORIES || widget.category === category) &&
        (!term || widget.label.toLowerCase().includes(term))
    );
  }, [library, category, search]);

  const backToBuilder = ROUTES.ADMIN.DASHBOARD_BUILDER.EDIT(role);

  if (configLoading || !config) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const roleLabel = ROLE_LABEL[config.role] ?? config.role;
  const dashboardName = `${roleLabel} · ${config.name}`;

  const handleAdd = (widget: LibraryWidget) => {
    saveDraft.mutate({
      role,
      widgets: [
        ...config.widgets,
        {
          id: `${widget.id}-${config.id}-${nextWidgetOrder(config.widgets)}`,
          label: widget.label,
          type: widget.type,
          enabled: true,
          order: nextWidgetOrder(config.widgets),
        },
      ],
      assignedRoles: config.assignedRoles,
      layoutColumns: config.layoutColumns,
      isDefault: config.isDefault,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link
          href={ROUTES.ADMIN.DASHBOARD_BUILDER.LIST}
          className="hover:underline"
        >
          Dashboards
        </Link>
        <span className="mx-1.5" aria-hidden>
          ›
        </span>
        <Link href={backToBuilder} className="hover:underline">
          {dashboardName}
        </Link>
        <span className="mx-1.5" aria-hidden>
          ›
        </span>
        <span className="text-foreground">Widget Library</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Widget Library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add widgets to {dashboardName}
          </p>
        </div>

        <div className="flex gap-2">
          <Link href={backToBuilder} className="inline-flex">
            <Button type="button" variant="outline">
              <ArrowLeft aria-hidden />
              Back to builder
            </Button>
          </Link>
          <Button type="button" onClick={() => router.push(backToBuilder)}>
            <Check aria-hidden />
            Done
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[180px_1fr]">
        <div
          role="group"
          aria-label="Widget category"
          className="flex flex-row flex-wrap gap-1 rounded-lg border p-2 lg:flex-col"
        >
          {[ALL_CATEGORIES, ...LIBRARY_CATEGORIES].map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={category === option}
              onClick={() => setCategory(option)}
              className={cn(
                "rounded-md px-3 py-2 text-left text-sm font-medium",
                category === option
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="relative">
            <Search
              className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search widgets…"
              aria-label="Search widgets"
              className="pl-8"
            />
          </div>

          {libraryLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((widget) => (
                <div
                  key={widget.id}
                  className="flex min-h-32 flex-col justify-between gap-3 rounded-lg border bg-card p-3.5"
                >
                  <div className="flex flex-1 items-center justify-center text-muted-foreground">
                    <Badge variant="outline">{widget.type.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{widget.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {widget.category}
                      </p>
                    </div>
                    {widget.added ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                        <Check className="size-3.5" aria-hidden />
                        Added
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={saveDraft.isPending}
                        onClick={() => handleAdd(widget)}
                      >
                        <Plus aria-hidden />
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {filtered.length === 0 ? (
                <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  No widgets match your search.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
