import { CalendarDays, Trophy } from "lucide-react";
import type { DashboardCompetition } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatDate(iso?: string | null): string {
  if (!iso) return "Date TBD";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function sortByDate(comps: DashboardCompetition[]): DashboardCompetition[] {
  return [...comps].sort((a, b) => {
    const av = a.start_date ?? "9999-12-31";
    const bv = b.start_date ?? "9999-12-31";
    return av.localeCompare(bv);
  });
}

function CompetitionItem({ comp }: { comp: DashboardCompetition }) {
  return (
    <Card data-testid="competition-item">
      <CardContent className="flex items-center justify-between gap-3 pt-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{comp.name}</p>
          <p className="truncate text-xs text-slate-500">
            {comp.skater_names.join(", ")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="flex items-center gap-1 text-sm text-slate-700">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="tabular-nums font-mono">{formatDate(comp.start_date)}</span>
          </span>
          <Badge
            variant={comp.entry_status === "confirmed" ? "success" : "warning"}
            className="capitalize"
          >
            {comp.entry_status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      <Trophy className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <span>No upcoming competitions scheduled.</span>
    </div>
  );
}

/** Upcoming competitions with confirmed/prospective rostered entries. */
export function UpcomingCompetitions({
  competitions,
}: {
  competitions: DashboardCompetition[];
}) {
  const sorted = sortByDate(competitions);
  return (
    <section aria-label="Upcoming Competitions" className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Upcoming Competitions</h2>
      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {sorted.map((c) => (
            <CompetitionItem key={c.competition_id} comp={c} />
          ))}
        </div>
      )}
    </section>
  );
}
