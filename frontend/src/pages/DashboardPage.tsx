import { useEffect, useMemo, useState } from "react";
import type { Skater } from "@/lib/types";
import { listSkaters } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { AddSkaterModal } from "@/components/skaters/AddSkaterModal";
import {
  StatsGrid,
  RestrictionAlert,
  RosterSection,
} from "@/components/dashboard/DashboardSections";

function useRoster(token: string | null, reloadKey: number) {
  const [skaters, setSkaters] = useState<Skater[]>([]);
  useEffect(() => {
    let active = true;
    listSkaters(token)
      .then((data) => active && setSkaters(data))
      .catch(() => active && setSkaters([]));
    return () => {
      active = false;
    };
  }, [token, reloadKey]);
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
  const { token, role } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const skaters = useRoster(token, reloadKey);
  const stats = useDashboardStats(skaters);
  const canManage = role === "coach" || role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        {canManage && (
          <Button onClick={() => setAddOpen(true)}>+ Add Skater</Button>
        )}
      </div>
      <StatsGrid active={stats.active} iceHours={stats.iceHours} restricted={stats.restricted} />
      {stats.restricted > 0 && <RestrictionAlert count={stats.restricted} />}
      <RosterSection skaters={skaters} />
      {canManage && (
        <AddSkaterModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreated={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
