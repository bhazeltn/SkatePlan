import { useCallback, useEffect, useState } from "react";
import type { DashboardSummary } from "@/lib/types";
import { getDashboard } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { AddSkaterModal } from "@/components/skaters/AddSkaterModal";
import { AttentionPanel } from "@/components/dashboard/AttentionPanel";
import { RestrictionsPanel } from "@/components/dashboard/RestrictionsPanel";
import { UpcomingCompetitions } from "@/components/dashboard/UpcomingCompetitions";
import { RosterSection } from "@/components/dashboard/DashboardSections";

const EMPTY: DashboardSummary = {
  roster: [],
  alerts: [],
  restrictions: [],
  upcoming_competitions: [],
};

function useDashboard(token: string | null, reloadKey: number) {
  const [data, setData] = useState<DashboardSummary>(EMPTY);
  useEffect(() => {
    let active = true;
    getDashboard(token)
      .then((d) => active && setData(d))
      .catch(() => active && setData(EMPTY));
    return () => {
      active = false;
    };
  }, [token, reloadKey]);
  return data;
}

export function DashboardPage() {
  const { token, role } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const data = useDashboard(token, reloadKey);
  const canManage = role === "coach" || role === "admin";
  const onCreated = useCallback(() => setReloadKey((k) => k + 1), []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Action &amp; Risk Hub — where your skaters need you today.
          </p>
        </div>
        {canManage && <Button onClick={() => setAddOpen(true)}>+ Add Skater</Button>}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <AttentionPanel alerts={data.alerts} />
        <RestrictionsPanel restrictions={data.restrictions} />
      </div>

      <UpcomingCompetitions competitions={data.upcoming_competitions} />
      <RosterSection skaters={data.roster} />

      {canManage && (
        <AddSkaterModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}
