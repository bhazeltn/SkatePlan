import type { SavedGapAssessment } from "@/lib/types";
import { PILLAR_LABEL, topPriorities } from "./gapScoring";

/** High-visibility summary of the latest assessment: gap vs met counts plus the
 *  top three priority focus areas (biggest shortfalls from the exit target). */
export function GapSummaryCard({ assessment }: { assessment: SavedGapAssessment }) {
  const priorities = topPriorities(assessment.delta_flags);
  return (
    <section
      data-testid="gap-summary"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-900">Assessment Summary</h2>
      <p className="mt-0.5 text-xs text-slate-500">{assessment.benchmark_framework}</p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-md bg-rose-50 p-3 ring-1 ring-rose-600/20">
          <p className="text-xs font-medium text-rose-700">Gaps Identified</p>
          <p
            data-testid="gaps-count"
            className="text-2xl font-bold tabular-nums text-rose-700"
          >
            {assessment.gaps_identified}
          </p>
        </div>
        <div className="rounded-md bg-emerald-50 p-3 ring-1 ring-emerald-600/20">
          <p className="text-xs font-medium text-emerald-700">Benchmarks Met</p>
          <p
            data-testid="met-count"
            className="text-2xl font-bold tabular-nums text-emerald-700"
          >
            {assessment.benchmarks_met}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-slate-800">
          Top Priority Focus Areas
        </h3>
        {priorities.length === 0 ? (
          <p className="mt-1 text-sm text-emerald-700">
            All pillars meet the competitive exit target.
          </p>
        ) : (
          <ol className="mt-2 space-y-1">
            {priorities.map((flag, index) => (
              <li
                key={flag.pillar}
                className="flex items-center justify-between gap-3 rounded-md
                  bg-amber-50 px-3 py-2 text-sm ring-1 ring-amber-600/20"
              >
                <span className="font-medium text-slate-800">
                  {index + 1}. {PILLAR_LABEL[flag.pillar] ?? flag.pillar}
                </span>
                <span className="text-xs text-amber-700">
                  {flag.score} → {flag.target}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
