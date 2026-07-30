"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABEL } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { useUser } from "@/features/users/api/queries";
import { UserStatusBadge } from "@/features/users/components/UserStatusBadge";

interface UserPreviewProps {
  userId: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
});

export const UserPreview = ({ userId }: UserPreviewProps) => {
  const { data: user, isLoading, isError } = useUser(userId);

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
        <CardTitle>{user.name}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-4 text-sm max-sm:grid-cols-1">
          <div>
            <dt className="text-muted-foreground">Role</dt>
            <dd className="font-medium">{ROLE_LABEL[user.role]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <UserStatusBadge status={user.status} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Added</dt>
            <dd className="font-medium">
              {dateFormatter.format(new Date(user.createdAt))}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Identifier</dt>
            <dd className="font-mono text-xs">{user.id}</dd>
          </div>
        </dl>

        <div className="flex gap-2">
          {/* Links styled as buttons: Base UI's `Button` assumes a native
              `<button>` and, told otherwise, stamps `role="button"` over the
              anchor's implicit `link` role. Both of these navigate. */}
          <Link
            href={ROUTES.ADMIN.USER_EDIT(user.id)}
            className={buttonVariants()}
          >
            Edit
          </Link>
          <Link
            href={ROUTES.ADMIN.USERS}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to users
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
