import { useSearchParams } from "react-router-dom";
import { GapAssessmentForm } from "@/components/gap/GapAssessmentForm";
import { GapSummaryCard } from "@/components/gap/GapSummaryCard";
import { useGapAssessment } from "@/components/gap/useGapAssessment";

/** Interactive coaching assessment: score a skater's four development pillars
 *  against a federation-neutral competitive exit standard and surface the
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
          Score each development pillar against a competitive exit standard to
          reveal the highest-priority focus areas.
        </p>
      </div>

      <div>
        <label
          htmlFor="skater-select"
          className="block text-sm font-medium text-slate-700"
        >
          Skater
        </label>
        <select
          id="skater-select"
          value={gap.skaterId}
          onChange={(e) => gap.setSkaterId(e.target.value)}
          className="mt-1 w-full max-w-sm rounded-md border border-slate-300
            bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500
            focus:outline-none"
        >
          <option value="">Select a skater…</option>
          {gap.skaters.map((s) => (
            <option key={s.skater_id} value={String(s.skater_id)}>
              {s.first_name} {s.last_name}
            </option>
          ))}
        </select>
      </div>

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
          disabled={gap.saving || !gap.skaterId || !gap.framework}
        />
        {gap.result ? (
          <GapSummaryCard assessment={gap.result} />
        ) : (
          <p className="text-sm text-slate-400">
            Save an assessment to see gap status and priority focus areas.
          </p>
        )}
      </div>
    </div>
  );
}
