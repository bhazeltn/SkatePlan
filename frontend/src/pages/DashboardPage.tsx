import { useEffect, useMemo, useState } from "react";
import type { Skater } from "@/lib/types";
import { listSkaters } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  StatsGrid,
  RestrictionAlert,
  RosterSection,
} from "@/components/dashboard/DashboardSections";

function useRoster(token: string | null) {
  const [skaters, setSkaters] = useState<Skater[]>([]);
  useEffect(() => {
    let active = true;
    listSkaters(token)
      .then((data) => active && setSkaters(data))
      .catch(() => active && setSkaters([]));
    return () => {
      active = false;
    };
  }, [token]);
  return skaters;
}

function useDashboardStats(skaters: Skater[]) {
  return useMemo(() => {
    const restricted = skaters.filter((s) => s.has_active_restriction);
    const iceMinutes = skaters.reduce((sum, s) => sum + (s.weekly_ice_minutes ?? 0), 0);
    return {
      active: skaters.length,
      iceHours: (iceMinutes / 60).toFixed(1),
      restricted: restricted.length,
    };
  }, [skaters]);
}

export function DashboardPage() {
  const { token } = useAuth();
  const skaters = useRoster(token);
  const stats = useDashboardStats(skaters);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <StatsGrid active={stats.active} iceHours={stats.iceHours} restricted={stats.restricted} />
      {stats.restricted > 0 && <RestrictionAlert count={stats.restricted} />}
      <RosterSection skaters={skaters} />
    </div>
  );
}
