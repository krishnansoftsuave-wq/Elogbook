"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import {
  TRAY_SIZE,
  useNotificationTray,
} from "@/features/notifications/api/queries";
import { NotificationItem } from "@/features/notifications/components/NotificationItem";
import { useNow } from "@/hooks/useNow";

/**
 * The header bell — the prototype's tray (`app-source.txt` 191–210).
 *
 * **FR-NOT-01** is "All roles", and this lives in the shared `Header` rather
 * than on any one screen: a notification about an overdue action is only useful
 * if it reaches you while you are doing something else.
 *
 * The badge shows the **server's** unread total, not the unread among the six
 * rows fetched — an earlier version did the latter and announced "none unread"
 * to somebody with fourteen unread below the fold. `useNotificationTray` records
 * what that costs.
 *
 * The Group wrapper around the label is required, not cosmetic: Base UI's label
 * *is* a group label and throws without a group ancestor. Omitting it crashed a
 * whole screen in Phase 1c the moment its menu opened; `Header.tsx` carries the
 * same note.
 */
interface NotificationsTrayProps {
  /**
   * Optionally controlled, so `Header` can keep this and the sub-type pill
   * mutually exclusive — the prototype closes each when the other opens
   * (`app-source.txt` 231, 249). Left uncontrolled the tray owns its own state,
   * which is what every existing caller and test relies on.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const NotificationsTray = ({
  open: controlledOpen,
  onOpenChange,
}: NotificationsTrayProps = {}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const { data, isLoading } = useNotificationTray();
  const now = useNow();

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          />
        }
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications, none unread"
        }
      >
        <Bell aria-hidden />
        {unread > 0 ? (
          <span
            className="text-destructive-foreground absolute end-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[0.625rem] font-semibold tabular-nums"
            aria-hidden
          >
            {unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))]"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        </DropdownMenuGroup>

        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nothing to catch up on.
          </p>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto">
            {items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                at={now}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </ul>
        )}

        <DropdownMenuSeparator />
        <Link
          href={ROUTES.NOTIFICATIONS}
          className="block px-3 py-2 text-center text-sm text-primary hover:underline"
          onClick={() => setOpen(false)}
        >
          {data && data.total > TRAY_SIZE
            ? `View all ${data.total} notifications`
            : "View all notifications"}
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
