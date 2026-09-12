import { Badge } from "@/components/ui/badge";
import { shipmentStatusLabel } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const variant = status === "PURCHASED" ? "success" : status === "FAILED" ? "destructive" : "secondary";
  return <Badge variant={variant}>{shipmentStatusLabel(status)}</Badge>;
}
