import { useState } from "react";
import type { SkaterProgram } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { ProgramBuilder } from "@/components/programs/ProgramBuilder";

const TYPE_LABELS: Record<string, string> = { SP: "Short Program", FS: "Free Skate" };

/** Programs tab: existing layouts + the sandbox builder. */
export function ProgramsTab({
  skaterId,
  programs,
  onProgramSaved,
}: {
  skaterId: number;
  programs: SkaterProgram[];
  onProgramSaved: () => void;
}) {
  const [building, setBuilding] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Program layouts</h2>
        <button
          type="button"
          onClick={() => setBuilding((v) => !v)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm
            font-medium text-slate-700 hover:bg-slate-50"
        >
          + Build New Program
        </button>
      </div>

      {programs.length === 0 ? (
        <p className="text-sm text-slate-400">No programs planned yet.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {programs.map((p) => (
            <li key={p.id}>
              <Card>
                <CardContent className="space-y-1 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {TYPE_LABELS[p.program_type] ?? p.program_type}
                  </p>
                  <p className="font-semibold text-slate-900">{p.title}</p>
                  {p.season && (
                    <p className="text-xs tabular-nums text-slate-500">{p.season}</p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {building && (
        <ProgramBuilder
          skaterId={skaterId}
          onSaved={() => {
            setBuilding(false);
            onProgramSaved();
          }}
        />
      )}
    </div>
  );
}
