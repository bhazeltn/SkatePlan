import { BENCHMARK_STATUSES } from "@/components/gap/gapScoring";
import type { BenchmarkStatus, SkaterBenchmark } from "@/lib/types";

interface Props {
  benchmark: SkaterBenchmark;
  onStatus: (id: string, status: BenchmarkStatus) => void;
  onDelete: (id: string) => void;
}

const ACTIVE = "border-slate-900 bg-slate-900 text-white";
const IDLE = "border-slate-300 bg-white text-slate-600 hover:bg-slate-50";

/** One benchmark target: name, optional target date, one-click status chips that
 *  PATCH the status, and a delete action. Status chips are the interactive
 *  toggles that drive the gap-delta summary. */
export function BenchmarkItemRow({ benchmark, onStatus, onDelete }: Props) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-md
        border border-slate-200 bg-white px-3 py-2"
    >
      <div className="min-w-[8rem]">
        <p className="text-sm font-medium text-slate-900">{benchmark.name}</p>
        {benchmark.target_date ? (
          <p className="text-xs tabular-nums text-slate-500">
            Target {benchmark.target_date}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {BENCHMARK_STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            aria-pressed={benchmark.status === s.value}
            onClick={() => onStatus(benchmark.id, s.value)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium
              transition-colors ${
                benchmark.status === s.value ? ACTIVE : IDLE
              }`}
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          aria-label={`Delete ${benchmark.name}`}
          onClick={() => onDelete(benchmark.id)}
          className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1
            text-xs font-medium text-rose-600 hover:bg-rose-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
