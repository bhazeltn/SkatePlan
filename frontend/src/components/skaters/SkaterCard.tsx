import { AlertTriangle, MapPin } from "lucide-react";
import type { Skater } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function SkaterHeader({ skater }: { skater: Skater }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">
          {skater.first_name} {skater.last_name}
        </p>
        {skater.level_name && <p className="text-xs text-slate-500">{skater.level_name}</p>}
      </div>
      {skater.has_active_restriction && (
        <Badge variant="danger" className="shrink-0 gap-1">
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          Restricted
        </Badge>
      )}
    </div>
  );
}

/** Roster card summarizing a single skater. Numeric ice volume uses
 *  tabular-nums so figures align across the grid. */
export function SkaterCard({ skater }: { skater: Skater }) {
  return (
    <Card data-testid="skater-card">
      <CardContent className="space-y-2 pt-4">
        <SkaterHeader skater={skater} />
        {skater.home_club && (
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {skater.home_club}
          </p>
        )}
        <div className="flex items-baseline justify-between border-t border-slate-100 pt-2">
          <span className="text-xs text-slate-500">Weekly ice</span>
          <span className="tabular-nums font-mono text-sm font-semibold text-slate-900">
            {skater.weekly_ice_minutes ?? 0} min
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
