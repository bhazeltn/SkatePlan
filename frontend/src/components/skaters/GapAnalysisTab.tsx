import {
  PILLAR_LABELS,
  statusClass,
  statusLabel,
  useGapReport,
} from "@/components/skaters/gapData";
import type { GapEntry } from "@/lib/types";

function measuredText(entry: GapEntry): string {
  const measured =
    entry.measured === null || entry.measured === undefined
      ? "—"
      : Number(entry.measured).toFixed(2);
  const target =
    entry.target === null || entry.target === undefined
      ? "—"
      : Number(entry.target).toFixed(2);
  return `${measured} / ${target}`;
}

function BenchmarkRow({ entry }: { entry: GapEntry }) {
  return (
    <li
      className="flex items-center justify-between gap-3 rounded-md border
        border-slate-200 bg-white px-3 py-2"
    >
      <span className="text-sm font-medium text-slate-900">{entry.title}</span>
      <span className="flex items-center gap-3">
        <span className="tabular-nums text-xs text-slate-500">
          {measuredText(entry)}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1
            ring-inset ${statusClass(entry.status)}`}
        >
          {statusLabel(entry.status)}
        </span>
      </span>
    </li>
  );
}

/** Coach-driven view: LTD Exit Standard assessment grouped by pillar. */
export function GapAnalysisTab({ skaterId }: { skaterId: number | string }) {
  const { report, loading, error } = useGapReport(skaterId);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading gap analysis…</p>;
  }
  if (error || !report) {
    return (
      <p className="text-sm text-slate-400">
        No exit standard assigned yet. Set a target standard to assess the gap.
      </p>
    );
  }

  const pillars = Object.keys(PILLAR_LABELS).filter(
    (key) => (report.pillars[key] ?? []).length > 0
  );

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          LTD Exit Standard
        </h3>
        <p className="text-xs text-slate-500">
          Coach assessment of technical exit benchmarks against the target standard.
        </p>
      </div>
      {pillars.length === 0 ? (
        <p className="text-sm text-slate-400">No benchmarks recorded yet.</p>
      ) : (
        pillars.map((key) => (
          <div key={key} className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {PILLAR_LABELS[key]}
            </h4>
            <ul className="space-y-2">
              {report.pillars[key].map((entry) => (
                <BenchmarkRow key={entry.benchmark_id} entry={entry} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
