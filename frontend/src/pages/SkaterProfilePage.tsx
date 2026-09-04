import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getSkater } from "@/lib/api";
import type { SkaterDetail } from "@/lib/types";
import { ProfileHeader } from "@/components/skaters/ProfileHeader";
import { ProfileTabs, type ProfileTab } from "@/components/skaters/ProfileTabs";
import { ProgramsTab } from "@/components/skaters/ProgramsTab";
import { RestrictionsTab } from "@/components/skaters/RestrictionsTab";
import { GoalsTab } from "@/components/skaters/GoalsTab";
import { GapAnalysisTab } from "@/components/skaters/GapAnalysisTab";

function EmptyTab({ label }: { label: string }) {
  return <p className="text-sm text-slate-400">{label}</p>;
}

function buildTabs(skater: SkaterDetail, onChanged: () => void): ProfileTab[] {
  return [
    {
      label: "Programs",
      content: (
        <ProgramsTab
          skaterId={skater.skater_id}
          programs={skater.programs}
          onProgramSaved={onChanged}
        />
      ),
    },
    {
      label: "Health & Load",
      content: (
        <RestrictionsTab
          skaterId={skater.skater_id}
          restrictions={skater.restrictions}
          onChanged={onChanged}
        />
      ),
    },
    {
      label: "Goals",
      content: <GoalsTab skaterId={skater.skater_id} />,
    },
    {
      label: "Gap Analysis",
      content: <GapAnalysisTab skaterId={skater.skater_id} />,
    },
    {
      label: "Competitions",
      content: <EmptyTab label="Competition entries coming soon." />,
    },
  ];
}

export function SkaterProfilePage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [skater, setSkater] = useState<SkaterDetail | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    getSkater(id, token)
      .then(setSkater)
      .catch(() => setError(true));
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return <p className="p-6 text-sm text-red-600">Unable to load skater.</p>;
  }
  if (!skater) {
    return <p className="p-6 text-sm text-slate-400">Loading profile…</p>;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <ProfileHeader skater={skater} />
      <ProfileTabs tabs={buildTabs(skater, load)} />
    </main>
  );
}
