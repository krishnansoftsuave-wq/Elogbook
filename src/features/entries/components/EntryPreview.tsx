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
import { ROUTES } from "@/constants/routes";
import { useEntry } from "@/features/entries/api/queries";
import { EntryStatusBadge } from "@/features/entries/components/EntryStatusBadge";

interface EntryPreviewProps {
  entryId: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" });

export const EntryPreview = ({ entryId }: EntryPreviewProps) => {
  const { data: entry, isLoading, isError } = useEntry(entryId);

  if (isLoading) return <Skeleton className="h-80 w-full max-w-2xl" />;

  if (isError || !entry) {
    return (
      <p className="text-sm text-muted-foreground">
        This entry could not be loaded.
      </p>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{entry.title}</CardTitle>
        <CardDescription>
          {entry.authorName} ·{" "}
          {dateFormatter.format(new Date(entry.performedAt))}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <EntryStatusBadge status={entry.status} />

        {/* Author-entered prose: preserve their line breaks. */}
        <p className="text-sm whitespace-pre-wrap">{entry.body}</p>

        {entry.signedBy && entry.signedAt ? (
          <p className="text-sm text-muted-foreground">
            Signed by {entry.signedBy} on{" "}
            {dateFormatter.format(new Date(entry.signedAt))}.
          </p>
        ) : null}

        <div className="flex gap-2">
          {/* Links styled as buttons: Base UI's `Button` assumes a native
              `<button>` and, told otherwise, stamps `role="button"` over the
              anchor's implicit `link` role. Both of these navigate. */}
          {entry.status === "signed" ? null : (
            <Link
              href={ROUTES.ENTRY_EDIT(entry.id)}
              className={buttonVariants()}
            >
              Edit
            </Link>
          )}
          <Link
            href={ROUTES.LOGBOOK}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to logbook
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
