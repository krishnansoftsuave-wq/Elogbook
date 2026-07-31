"use client";

import { useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { roleLabel } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/features/auth/hooks/useSession";
import { useUser } from "@/features/users/api/queries";
import { UserAccessDialog } from "@/features/users/components/UserAccessDialog";
import { UserStatusBadge } from "@/features/users/components/UserStatusBadge";
import { hasPermission } from "@/lib/auth/permissions";
import { formatPlantTimestamp } from "@/lib/datetime";
import type { User } from "@/types/user";

interface UserPreviewProps {
  username: string;
}

/**
 * One person in the directory — **FR-ADM-01**.
 *
 * Every field except `status` is Active Directory's (**FR-AUTH-02**), so this
 * screen is a read-out with one control. The card says so in as many words:
 * without it, an Administrator looking at a screen full of uneditable fields
 * would reasonably conclude the platform was broken rather than deliberately
 * deferring to the directory.
 */
export const UserPreview = ({ username }: UserPreviewProps) => {
  const { data: user, isLoading, isError } = useUser(username);
  const { permissions } = useSession();
  const [userToChange, setUserToChange] = useState<User | null>(null);

  const mayChangeAccess = hasPermission(permissions, WILDCARD_PERMISSION);

  if (isLoading) return <Skeleton className="h-64 w-full max-w-xl" />;

  if (isError || !user) {
    return (
      <p className="text-sm text-muted-foreground">
        This user could not be loaded.
      </p>
    );
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{user.displayName}</CardTitle>
        <CardDescription className="font-mono">{user.username}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-4 text-sm max-sm:grid-cols-1">
          <div>
            <dt className="text-muted-foreground">Roles</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {user.roles.length === 0 ? (
                <span className="text-muted-foreground italic">
                  No platform role — this account cannot sign in
                </span>
              ) : (
                user.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {roleLabel(role)}
                  </Badge>
                ))
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Platform access</dt>
            <dd className="mt-1">
              <UserStatusBadge status={user.status} />
            </dd>
          </div>
          <div className="col-span-full">
            <dt className="text-muted-foreground">Active Directory groups</dt>
            <dd className="mt-1">
              {user.adGroups.length === 0 ? (
                <span className="text-muted-foreground italic">None</span>
              ) : (
                <ul className="flex flex-col gap-0.5 font-mono text-xs">
                  {user.adGroups.map((group) => (
                    <li key={group}>{group}</li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last seen</dt>
            <dd className="font-medium">
              {/*
                Plant time, like every other timestamp in the app. `lib/datetime`
                notes that a per-user activity time is the one case where a
                reader might want their own clock — but two clocks in one release
                was a real defect in Phase 2, so this stays on the plant's and
                the label says which.
              */}
              {user.lastSeenAt
                ? `${formatPlantTimestamp(user.lastSeenAt)} GST`
                : "Never signed in"}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-muted-foreground">
          Names, groups and roles come from Active Directory and are changed
          there (FR-AUTH-02). Platform access is the one setting this screen
          owns.
        </p>

        <div className="flex flex-wrap gap-2">
          {mayChangeAccess ? (
            <Button
              type="button"
              variant={user.status === "active" ? "destructive" : "default"}
              onClick={() => setUserToChange(user)}
            >
              {user.status === "active" ? "Suspend access" : "Restore access"}
            </Button>
          ) : null}
          {/* A link styled as a button: Base UI's `Button` assumes a native
              `<button>` and, told otherwise, stamps `role="button"` over the
              anchor's implicit `link` role. This navigates. */}
          <Link
            href={ROUTES.ADMIN.USERS}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to users
          </Link>
        </div>
      </CardContent>

      <UserAccessDialog
        user={userToChange}
        onClose={() => setUserToChange(null)}
      />
    </Card>
  );
};
