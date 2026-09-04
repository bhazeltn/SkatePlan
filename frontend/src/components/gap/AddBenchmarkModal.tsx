import { useState } from "react";
import {
  BENCHMARK_CATEGORIES,
  BENCHMARK_STATUSES,
} from "@/components/gap/gapScoring";
import type { BenchmarkStatus, SkaterBenchmarkPayload } from "@/lib/types";

interface Props {
  onSave: (payload: SkaterBenchmarkPayload) => Promise<void>;
  onCancel: () => void;
}

const FIELD =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm " +
  "text-slate-900 focus:border-slate-500 focus:outline-none";

/** Inline coach form to define a new custom benchmark target: flexible category,
 *  a target name, the current status and optional notes / target date. */
export function AddBenchmarkModal({ onSave, onCancel }: Props) {
  const [category, setCategory] = useState<string>(BENCHMARK_CATEGORIES[0]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<BenchmarkStatus>("NOT_STARTED");
  const [notes, setNotes] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        category,
        name: name.trim(),
        status,
        notes: notes.trim() || null,
        target_date: targetDate || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Category
          <select
            className={FIELD}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {BENCHMARK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Target Name
          <input
            className={FIELD}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Triple Axel"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Current Status
          <select
            className={FIELD}
            value={status}
            onChange={(e) => setStatus(e.target.value as BenchmarkStatus)}
          >
            {BENCHMARK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Target Date
          <input
            type="date"
            className={`${FIELD} tabular-nums`}
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Notes
          <textarea
            className={FIELD}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium
            text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Save Benchmark
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-4 py-2
            text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
