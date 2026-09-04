import { ShieldCheck } from "lucide-react";
import type { DashboardRestriction } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function statusVariant(status: string): "danger" | "warning" | "default" {
  const s = status.toLowerCase();
  if (s === "active") return "danger";
  if (s === "monitoring" || s === "recovering") return "warning";
  return "default";
}

function RestrictionCard({ item }: { item: DashboardRestriction }) {
  return (
    <Card>
      <CardContent className="space-y-1.5 pt-4">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-semibold text-slate-900">{item.skater_name}</p>
          <Badge variant={statusVariant(item.status)} className="shrink-0 capitalize">
            {item.status}
          </Badge>
        </div>
        <p className="text-sm font-medium text-slate-700">{item.title}</p>
        {item.restrictions && (
          <p className="text-sm text-slate-600">{item.restrictions}</p>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
      <span>All skaters cleared for standard load.</span>
    </div>
  );
}

/** Itemized active load restrictions (never a bare count). */
export function RestrictionsPanel({
  restrictions,
}: {
  restrictions: DashboardRestriction[];
}) {
  return (
    <section aria-label="Active Load Restrictions" className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">
        Active Load Restrictions
      </h2>
      {restrictions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {restrictions.map((r) => (
            <RestrictionCard key={`${r.skater_id}-${r.title}`} item={r} />
          ))}
        </div>
      )}
    </section>
  );
}
