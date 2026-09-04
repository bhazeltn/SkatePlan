import { useState } from "react";
import { GapAssessmentForm } from "@/components/gap/GapAssessmentForm";
import { GapSummaryCard } from "@/components/gap/GapSummaryCard";
import { useGapAssessment } from "@/components/gap/useGapAssessment";
import type { SavedGapAssessment } from "@/lib/types";

/** Empty state shown when a skater has no benchmark assessment on record. */
function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="rounded-lg border border-dashed border-slate-300 bg-slate-50
        p-6 text-center"
    >
      <h3 className="text-sm font-semibold text-slate-900">
        No benchmark assessment on record
      </h3>
      <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
        Score this athlete's four development pillars against a competitive
        benchmark standard to reveal the highest-priority focus areas.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium
          text-white hover:bg-slate-700"
      >
        + New Benchmark Assessment
      </button>
    </div>
  );
}

/** Prefill the working draft from a saved assessment so it can be updated. */
function prefill(
  result: SavedGapAssessment,
  gap: ReturnType<typeof useGapAssessment>
): void {
  gap.setFramework(result.benchmark_framework);
  Object.entries(result.pillar_scores).forEach(([pillar, level]) =>
    gap.setScore(pillar, level)
  );
  gap.setNotes(result.coach_notes ?? "");
}

/** Coach-driven view: interactive benchmark assessment for one athlete. Shows an
 *  empty state, the scoring form, or the saved summary keyed off the result. */
export function GapAnalysisTab({ skaterId }: { skaterId: number | string }) {
  const gap = useGapAssessment(String(skaterId));
  const [editing, setEditing] = useState(false);

  const startNew = () => {
    setEditing(true);
  };

  const startUpdate = () => {
    if (gap.result) prefill(gap.result, gap);
    setEditing(true);
  };

  const handleSubmit = async () => {
    await gap.submit();
    setEditing(false);
  };

  if (editing) {
    return (
      <GapAssessmentForm
        templates={gap.templates}
        framework={gap.framework}
        scores={gap.scores}
        notes={gap.notes}
        onFramework={gap.setFramework}
        onScore={gap.setScore}
        onNotes={gap.setNotes}
        onSubmit={handleSubmit}
        disabled={gap.saving || !gap.framework}
      />
    );
  }

  if (!gap.result) {
    return <EmptyState onStart={startNew} />;
  }

  return (
    <section className="space-y-4">
      <GapSummaryCard assessment={gap.result} />
      <button
        type="button"
        onClick={startUpdate}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm
          font-medium text-slate-700 hover:bg-slate-50"
      >
        Update Assessment
      </button>
    </section>
  );
}
