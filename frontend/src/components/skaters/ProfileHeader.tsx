import type { SkaterDetail } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { flagEmoji } from "@/lib/flags";

/** Identity header for the skater profile hub. */
export function ProfileHeader({ skater }: { skater: SkaterDetail }) {
  const flag = flagEmoji(skater.country_code);
  const affiliation = [skater.federation_name, skater.home_club]
    .filter(Boolean)
    .join(" • ");
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b
      border-slate-200 pb-4">
      <div className="min-w-0 space-y-1">
        <h1 className="truncate text-xl font-semibold text-slate-900">
          {skater.first_name} {skater.last_name}
        </h1>
        <p className="text-sm text-slate-600">
          {flag && <span className="mr-1">{flag}</span>}
          {affiliation}
        </p>
        {skater.competitive_level && (
          <p className="text-xs font-medium tabular-nums text-slate-500">
            {skater.competitive_level}
          </p>
        )}
      </div>
      <Badge variant={skater.has_active_restriction ? "danger" : "success"}>
        {skater.has_active_restriction ? "Restricted" : "Cleared"}
      </Badge>
    </header>
  );
}
