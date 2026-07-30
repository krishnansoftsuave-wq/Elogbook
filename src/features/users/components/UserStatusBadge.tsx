import { Badge } from "@/components/ui/badge";
import type { UserStatus } from "@/types/user";

const VARIANT_BY_STATUS: Record<
  UserStatus,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  active: { label: "Active", variant: "default" },
  invited: { label: "Invited", variant: "secondary" },
  suspended: { label: "Suspended", variant: "destructive" },
};

interface UserStatusBadgeProps {
  status: UserStatus;
}

export const UserStatusBadge = ({ status }: UserStatusBadgeProps) => {
  const { label, variant } = VARIANT_BY_STATUS[status];
  return <Badge variant={variant}>{label}</Badge>;
};
