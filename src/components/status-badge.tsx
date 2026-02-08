import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

const STATUS_CONFIG = {
  queued: {
    label: "Queued",
    variant: "secondary" as const,
    Icon: Clock,
  },
  running: {
    label: "Running",
    variant: "default" as const,
    Icon: Loader2,
  },
  success: {
    label: "Success",
    variant: "default" as const,
    Icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    variant: "destructive" as const,
    Icon: XCircle,
  },
} as const;

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
    label: status,
    variant: "secondary" as const,
    Icon: Clock,
  };

  return (
    <Badge variant={config.variant} className="gap-1">
      <config.Icon
        className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`}
      />
      {config.label}
    </Badge>
  );
}
