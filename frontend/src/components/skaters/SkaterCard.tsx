import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import type { Skater } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { flagEmoji } from "@/lib/flags";

/** Build the "[flag] [federation] • [home club]" affiliation line. */
function affiliation(skater: Skater): string {
  const flag = flagEmoji(skater.country_code);
  const parts = [skater.federation_name, skater.home_club].filter(Boolean);
  const line = parts.join(" • ");
  return [flag, line].filter(Boolean).join(" ");
}

/** Roster card summarizing a single skater. The whole card is a link to the
 *  skater's profile hub. */
export function SkaterCard({ skater }: { skater: Skater }) {
  const level = skater.competitive_level ?? skater.level_name;
  return (
    <Link
      to={`/skaters/${skater.skater_id}`}
      data-testid="skater-card"
      className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
    >
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="space-y-1.5 pt-4">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-slate-900">
              {skater.first_name} {skater.last_name}
            </p>
            {skater.has_active_restriction && (
              <Badge variant="danger" className="shrink-0 gap-1">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Restricted
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-slate-500">{affiliation(skater)}</p>
          {level && (
            <p className="text-xs font-medium tabular-nums text-slate-600">{level}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
