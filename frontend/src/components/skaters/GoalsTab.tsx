import { useGapReport } from "@/components/skaters/gapData";
import type { GapEntry } from "@/lib/types";

function targetText(entry: GapEntry): string {
  if (entry.target === null || entry.target === undefined) return "Achieve";
  if (entry.evaluation_mode === "binary") return "Land clean";
  if (entry.evaluation_mode === "level") return `Reach level ${entry.target}`;
  return `Target ${Number(entry.target).toFixed(2)}`;
}

/** Skater-driven view: the milestone targets pulled from the benchmark standard. */
export function GoalsTab({ skaterId }: { skaterId: number | string }) {
  const { report, loading, error } = useGapReport(skaterId);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading goals…</p>;
  }
  if (error || !report) {
    return (
      <p className="text-sm text-slate-400">
        No milestone targets set yet. Assign a benchmark standard to see goals.
      </p>
    );
  }

  const goals = Object.values(report.pillars).flat();

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Milestone Targets</h3>
        <p className="text-xs text-slate-500">
          What you are working toward for your benchmark standard.
        </p>
      </div>
      {goals.length === 0 ? (
        <p className="text-sm text-slate-400">No milestone targets set yet.</p>
      ) : (
        <ul className="space-y-2">
          {goals.map((goal) => (
            <li
              key={goal.benchmark_id}
              className="flex items-center justify-between gap-3 rounded-md border
                border-slate-200 bg-white px-3 py-2"
            >
              <span className="text-sm font-medium text-slate-900">
                {goal.title}
              </span>
              <span className="tabular-nums text-xs font-medium text-slate-600">
                {targetText(goal)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
