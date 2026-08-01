"use client";

import { CircleDot, ListChecks, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROLE_LABEL } from "@/constants/roles";
import type { DashboardConfig } from "@/features/dashboard-builder/schemas";

interface PublishPanelProps {
  config: DashboardConfig;
  changelog: readonly string[];
  isPublishing: boolean;
  onPublish: () => void;
}

/**
 * The prototype's `dashPublish` "Publish changes" card (`app-source.txt`
 * 2184–2191). "Schedule for later" renders inert — no scheduler exists
 * anywhere in this build — matching `RoleForm`'s convention for the
 * unenforced area-restricted data scope: present, explained, not wired.
 * `changelog` renders whatever the live version's mock snapshot recorded
 * (currently a single generic entry) rather than the prototype's fake
 * per-change icons — this repo has no widget-diffing logic to back that.
 */
export const PublishPanel = ({
  config,
  changelog,
  isPublishing,
  onPublish,
}: PublishPanelProps) => {
  const roleLabel = ROLE_LABEL[config.role] ?? config.role;

  return (
    <div className="rounded-lg border p-4">
      {changelog.length > 0 && (
        <>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Changes in this version
          </p>
          <ul className="mb-4 flex flex-col gap-2 text-sm">
            {changelog.map((entry) => (
              <li key={entry} className="flex items-start gap-2">
                <ListChecks
                  className="mt-0.5 size-4 shrink-0 text-success"
                  aria-hidden
                />
                <span>{entry}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Target roles
      </p>
      <p className="mb-4 flex flex-wrap gap-1 text-sm">
        {config.assignedRoles.map((role) => ROLE_LABEL[role]).join(", ")} ·{" "}
        {config.affectedUserCount} users
      </p>

      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        When
      </p>
      <div className="mb-4 flex flex-col gap-2 text-sm">
        <span className="flex items-center gap-2">
          <CircleDot className="size-4 text-primary" aria-hidden />
          Publish now
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="size-4 rounded-full border-2" aria-hidden />
          Schedule for later
          <span className="text-xs italic">(not available)</span>
        </span>
      </div>

      <Button
        type="button"
        className="w-full justify-center"
        disabled={isPublishing}
        onClick={onPublish}
      >
        <Upload aria-hidden />
        Publish to {roleLabel}s
      </Button>
    </div>
  );
};
