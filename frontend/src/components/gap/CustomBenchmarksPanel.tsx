import { useState } from "react";
import { AddBenchmarkModal } from "@/components/gap/AddBenchmarkModal";
import { BenchmarkItemRow } from "@/components/gap/BenchmarkItemRow";
import {
  groupByCategory,
  summarizeBenchmarks,
  type BenchmarkSummary,
} from "@/components/gap/gapScoring";
import { useSkaterBenchmarks } from "@/components/gap/useSkaterBenchmarks";

function Stat({ testid, label, value }: { testid: string; label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-center">
      <p data-testid={testid} className="text-xl font-bold tabular-nums text-slate-900">
        {value}
      </p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

/** Gap delta rollup across every coach-defined benchmark. */
function GapDeltaSummary({ summary }: { summary: BenchmarkSummary }) {
  return (
    <div
      data-testid="benchmark-summary"
      className="grid grid-cols-2 gap-2 sm:grid-cols-5"
    >
      <Stat testid="bench-total" label="Total Defined" value={summary.total} />
      <Stat testid="bench-met" label="Met" value={summary.met} />
      <Stat testid="bench-developing" label="Developing" value={summary.developing} />
      <Stat testid="bench-gaps" label="Gaps (Unmet)" value={summary.gaps} />
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-center">
        <p className="text-xl font-bold tabular-nums text-slate-900">
          {summary.pctMet}%
        </p>
        <p className="text-xs font-medium text-slate-500">% Met</p>
      </div>
    </div>
  );
}

/** Fully coach-driven custom benchmark matrix (Sprint 6). Coaches add discrete
 *  targets across flexible categories, toggle status inline and delete items; a
 *  gap-delta summary rolls up Total / Met / Developing / Gaps deterministically. */
export function CustomBenchmarksPanel({ skaterId }: { skaterId: number | string }) {
  const { items, create, setStatus, remove } = useSkaterBenchmarks(skaterId);
  const [adding, setAdding] = useState(false);
  const summary = summarizeBenchmarks(items);

  const handleSave = async (payload: Parameters<typeof create>[0]) => {
    await create(payload);
    setAdding(false);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Custom Benchmark Targets
        </h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium
            text-white hover:bg-slate-700"
        >
          + Add Benchmark
        </button>
      </div>

      <GapDeltaSummary summary={summary} />

      {adding ? (
        <AddBenchmarkModal onSave={handleSave} onCancel={() => setAdding(false)} />
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-slate-400">
          No custom benchmarks defined yet. Add targets to build this athlete's
          development matrix.
        </p>
      ) : (
        <div className="space-y-4">
          {groupByCategory(items).map(([category, rows]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {category}
              </h3>
              {rows.map((b) => (
                <BenchmarkItemRow
                  key={b.id}
                  benchmark={b}
                  onStatus={setStatus}
                  onDelete={remove}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
