import { Badge } from "@/components/ui/badge";
import type { UserStatus } from "@/types/user";

/**
 * Two states, not three. `invited` is gone with the create flow: accounts
 * originate in Active Directory, so nothing in this platform ever issues an
 * invitation. A person is either allowed in or held out.
 */
const VARIANT_BY_STATUS: Record<
  UserStatus,
  { label: string; variant: "default" | "destructive" }
> = {
  active: { label: "Active", variant: "default" },
  suspended: { label: "Suspended", variant: "destructive" },
};

interface UserStatusBadgeProps {
  status: UserStatus;
}

export const UserStatusBadge = ({ status }: UserStatusBadgeProps) => {
  const { label, variant } = VARIANT_BY_STATUS[status];
  return <Badge variant={variant}>{label}</Badge>;
};
