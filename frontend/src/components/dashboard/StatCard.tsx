import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: string;
}

/** A macro KPI tile. The value renders with tabular-nums + font-mono so all
 *  dashboard figures share consistent digit widths. */
export function StatCard({ label, value, icon: Icon, accent }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">{label}</p>
          <p
            data-testid="stat-value"
            className="tabular-nums font-mono text-2xl font-bold text-slate-900"
          >
            {value}
          </p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
            accent ?? "bg-blue-50 text-blue-600"
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}
