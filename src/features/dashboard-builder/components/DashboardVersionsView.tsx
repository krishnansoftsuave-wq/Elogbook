"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, GitCompareArrows, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABEL } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { usePublishDashboard } from "@/features/dashboard-builder/api/mutations";
import {
  useDashboardConfig,
  useDashboardVersions,
} from "@/features/dashboard-builder/api/queries";
import { DashboardVersionsTable } from "@/features/dashboard-builder/components/DashboardVersionsTable";
import { PublishPanel } from "@/features/dashboard-builder/components/PublishPanel";

interface DashboardVersionsViewProps {
  role: string;
  /** Set when the Builder page's Publish button navigated here on success. */
  showPublishedBanner?: boolean;
}

/** The prototype's `dashPublish` (`app-source.txt` 2165–2192). */
export const DashboardVersionsView = ({
  role,
  showPublishedBanner = false,
}: DashboardVersionsViewProps) => {
  const router = useRouter();
  const { data: config, isLoading } = useDashboardConfig(role);
  const { data: versions } = useDashboardVersions(role);
  const publish = usePublishDashboard();
  const [showBanner, setShowBanner] = useState(showPublishedBanner);

  if (isLoading || !config) {
    return <Skeleton className="h-96 w-full" />;
  }

  const roleLabel = ROLE_LABEL[config.role] ?? config.role;
  const liveVersion = versions?.find((version) => version.status === "live");

  const dismissBanner = () => {
    setShowBanner(false);
    if (showPublishedBanner) {
      router.replace(ROUTES.ADMIN.DASHBOARD_BUILDER.VERSIONS(role));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {showBanner && liveVersion && (
        <div className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="size-[18px] shrink-0" aria-hidden />
          <span className="flex-1">
            <span className="font-semibold">Published successfully.</span>{" "}
            {config.name} {liveVersion.version} is now live for{" "}
            {config.affectedUserCount} {roleLabel}s.
          </span>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss"
            className="text-success/70 hover:text-success"
          >
            <X className="size-[17px]" aria-hidden />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Publish &amp; Versions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {roleLabel} · {config.name}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => toast.info("Version comparison isn't available yet")}
        >
          <GitCompareArrows aria-hidden />
          Compare versions
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <span className="text-sm font-semibold">Version history</span>
          </div>
          <DashboardVersionsTable role={role} />
        </div>

        <PublishPanel
          config={config}
          changelog={liveVersion?.changelog ?? []}
          isPublishing={publish.isPending}
          onPublish={() =>
            publish.mutate(role, {
              onSuccess: () => setShowBanner(true),
            })
          }
        />
      </div>
    </div>
  );
};
