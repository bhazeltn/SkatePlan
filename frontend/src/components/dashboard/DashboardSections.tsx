import { AlertTriangle, Activity, ShieldAlert, Trophy, Users } from "lucide-react";
import type { Skater } from "@/lib/types";
import { Alert } from "@/components/ui/alert";
import { StatCard } from "./StatCard";
import { SkaterCard } from "@/components/skaters/SkaterCard";

const UPCOMING_COMPETITIONS = 3; // placeholder KPI until competitions wiring.

interface StatsProps {
  active: number;
  iceHours: string;
  restricted: number;
}

export function StatsGrid({ active, iceHours, restricted }: StatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Active Skaters" value={active} icon={Users} />
      <StatCard label="Weekly Ice Volume" value={`${iceHours} h`} icon={Activity}
        accent="bg-emerald-50 text-emerald-600" />
      <StatCard label="Upcoming Competitions" value={UPCOMING_COMPETITIONS} icon={Trophy}
        accent="bg-amber-50 text-amber-600" />
      <StatCard label="Active Load Restrictions" value={restricted} icon={ShieldAlert}
        accent="bg-rose-50 text-rose-600" />
    </div>
  );
}

export function RestrictionAlert({ count }: { count: number }) {
  return (
    <Alert variant="danger">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        <strong className="tabular-nums font-mono">{count}</strong>{" "}
        skater(s) have an active load restriction requiring attention.
      </span>
    </Alert>
  );
}

export function RosterSection({ skaters }: { skaters: Skater[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Roster</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {skaters.map((s) => (
          <SkaterCard key={s.skater_id} skater={s} />
        ))}
      </div>
    </section>
  );
}
