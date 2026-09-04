import type { BenchmarkTemplate } from "@/lib/types";
import { ASSESSMENT_PILLARS, SCORE_LEVELS } from "./gapScoring";

interface Props {
  templates: BenchmarkTemplate[];
  framework: string;
  scores: Record<string, string>;
  notes: string;
  onFramework: (label: string) => void;
  onScore: (pillar: string, level: string) => void;
  onNotes: (notes: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

/** Interactive four-pillar benchmark scoring form. Deterministic controls; no
 *  business logic here — the parent owns state and submission. */
export function GapAssessmentForm(props: Props) {
  const { templates, framework, scores, notes } = props;
  return (
    <form
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit();
      }}
    >
      <div>
        <label
          htmlFor="benchmark-template"
          className="block text-sm font-medium text-slate-700"
        >
          Benchmark Template
        </label>
        <select
          id="benchmark-template"
          value={framework}
          onChange={(e) => props.onFramework(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3
            py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        >
          <option value="">Select a benchmark template…</option>
          {templates.map((t) => (
            <option key={t.key} value={t.label}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-800">
          Pillar Assessment
        </legend>
        {ASSESSMENT_PILLARS.map((pillar) => (
          <div key={pillar.key} className="grid grid-cols-2 items-center gap-3">
            <label
              htmlFor={`pillar-${pillar.key}`}
              className="text-sm font-medium text-slate-700"
            >
              {pillar.label}
            </label>
            <select
              id={`pillar-${pillar.key}`}
              value={scores[pillar.key] ?? ""}
              onChange={(e) => props.onScore(pillar.key, e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2
                text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
            >
              <option value="">—</option>
              {SCORE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        ))}
      </fieldset>

      <div>
        <label
          htmlFor="coach-notes"
          className="block text-sm font-medium text-slate-700"
        >
          Coach Notes
        </label>
        <textarea
          id="coach-notes"
          value={notes}
          rows={3}
          onChange={(e) => props.onNotes(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3
            py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={props.disabled}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium
          text-white hover:bg-slate-700 disabled:opacity-50"
      >
        Save Assessment
      </button>
    </form>
  );
}
