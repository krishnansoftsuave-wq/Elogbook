import { Badge } from "@/components/ui/badge";
import type { EntryStatus } from "@/types/entry";

const VARIANT_BY_STATUS: Record<
  EntryStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  draft: { label: "Draft", variant: "outline" },
  submitted: { label: "Submitted", variant: "secondary" },
  signed: { label: "Signed", variant: "default" },
};

interface EntryStatusBadgeProps {
  status: EntryStatus;
}

export const EntryStatusBadge = ({ status }: EntryStatusBadgeProps) => {
  const { label, variant } = VARIANT_BY_STATUS[status];
  return <Badge variant={variant}>{label}</Badge>;
};
