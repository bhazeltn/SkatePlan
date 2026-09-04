import { useSearchParams } from "react-router-dom";
import { GapAssessmentForm } from "@/components/gap/GapAssessmentForm";
import { GapSummaryCard } from "@/components/gap/GapSummaryCard";
import { useGapAssessment } from "@/components/gap/useGapAssessment";
import type { Skater } from "@/lib/types";

/** Clickable roster: selecting an athlete opens the interactive assessment. */
function RosterList({
  skaters,
  activeId,
  onSelect,
}: {
  skaters: Skater[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {skaters.map((s) => {
        const id = String(s.skater_id);
        const active = id === activeId;
        return (
          <button
            key={s.skater_id}
            type="button"
            onClick={() => onSelect(id)}
            className={`rounded-md border px-3 py-2 text-sm font-medium
              transition-colors ${
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
          >
            {s.first_name} {s.last_name}
          </button>
        );
      })}
    </div>
  );
}

/** Interactive coaching assessment: score a skater's four development pillars
 *  against a federation-neutral competitive benchmark standard and surface the
 *  biggest gaps as prioritized focus areas. Supports a ?skater= deep link from
 *  the profile Gap Analysis tab. */
export function GapAnalysisPage() {
  const [params] = useSearchParams();
  const gap = useGapAssessment(params.get("skater") ?? undefined);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Competitive Development &amp; Benchmark Assessment
        </h1>
        <p className="text-sm text-slate-500">
          Score each development pillar against a competitive benchmark standard
          to reveal the highest-priority focus areas.
        </p>
      </div>

      <div>
        <p className="mb-2 block text-sm font-medium text-slate-700">Skater</p>
        <RosterList
          skaters={gap.skaters}
          activeId={gap.skaterId}
          onSelect={gap.setSkaterId}
        />
      </div>

      {gap.skaterId ? (
        <div className="grid gap-4 md:grid-cols-2">
          <GapAssessmentForm
            templates={gap.templates}
            framework={gap.framework}
            scores={gap.scores}
            notes={gap.notes}
            onFramework={gap.setFramework}
            onScore={gap.setScore}
            onNotes={gap.setNotes}
            onSubmit={gap.submit}
            disabled={gap.saving || !gap.framework}
          />
          {gap.result ? (
            <GapSummaryCard assessment={gap.result} />
          ) : (
            <p className="text-sm text-slate-400">
              Save an assessment to see gap status and priority focus areas.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          Select an athlete to begin a benchmark assessment.
        </p>
      )}
    </div>
  );
}
