import { useState } from "react";
import type { SkaterProgram } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  ProgramBuilder,
  type InitialProgramData,
} from "@/components/programs/ProgramBuilder";
import { getProgram, deleteProgram } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const TYPE_LABELS: Record<string, string> = { SP: "Short Program", FS: "Free Skate" };

export function ProgramsTab({
  skaterId,
  programs,
  onProgramSaved,
}: {
  skaterId: number;
  programs: SkaterProgram[];
  onProgramSaved: () => void;
}) {
  const { token } = useAuth();
  const [building, setBuilding] = useState(false);
  const [editingProgram, setEditingProgram] = useState<InitialProgramData | null>(null);
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
  const [loadedElements, setLoadedElements] = useState<
    Record<string, { element_code: string; is_second_half_bonus: boolean }[]>
  >({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleToggleExpand(programId: string) {
    if (expandedProgramId === programId) {
      setExpandedProgramId(null);
      return;
    }
    setExpandedProgramId(programId);
    if (!loadedElements[programId]) {
      setLoadingId(programId);
      try {
        const detail = await getProgram(programId, token);
        const sorted = [...(detail.program_elements || [])].sort(
          (a, b) => a.segment_order - b.segment_order
        );
        setLoadedElements((prev) => ({ ...prev, [programId]: sorted }));
      } finally {
        setLoadingId(null);
      }
    }
  }

  async function handleEdit(p: SkaterProgram) {
    setLoadingId(p.id);
    try {
      const detail = await getProgram(p.id, token);
      const sorted = [...(detail.program_elements || [])].sort(
        (a, b) => a.segment_order - b.segment_order
      );
      setEditingProgram({
        id: p.id,
        program_type: (p.program_type as "SP" | "FS") || "SP",
        title: p.title,
        elements: sorted.map((e) => ({
          element_code: e.element_code,
          is_second_half_bonus: e.is_second_half_bonus,
        })),
      });
      setBuilding(false);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(programId: string) {
    if (!confirm("Are you sure you want to delete this program?")) return;
    await deleteProgram(programId, token);
    onProgramSaved();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Program layouts</h2>
        {!building && !editingProgram && (
          <button
            type="button"
            onClick={() => {
              setEditingProgram(null);
              setBuilding(true);
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm
              font-medium text-slate-700 hover:bg-slate-50"
          >
            + Build New Program
          </button>
        )}
      </div>

      {building && (
        <ProgramBuilder
          skaterId={skaterId}
          onSaved={() => {
            setBuilding(false);
            onProgramSaved();
          }}
          onCancel={() => setBuilding(false)}
        />
      )}

      {editingProgram && (
        <ProgramBuilder
          skaterId={skaterId}
          initialProgram={editingProgram}
          onSaved={() => {
            setEditingProgram(null);
            onProgramSaved();
          }}
          onCancel={() => setEditingProgram(null)}
        />
      )}

      {!building && !editingProgram && programs.length === 0 && (
        <p className="text-sm text-slate-400">No programs planned yet.</p>
      )}

      {!building && !editingProgram && programs.length > 0 && (
        <div className="space-y-3">
          {programs.map((p) => {
            const isExpanded = expandedProgramId === p.id;
            const elements = loadedElements[p.id];
            const isLoading = loadingId === p.id;

            return (
              <Card key={p.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {TYPE_LABELS[p.program_type] ?? p.program_type}
                      </p>
                      <h3 className="text-base font-semibold text-slate-900">{p.title}</h3>
                      {p.season && (
                        <p className="text-xs text-slate-500 tabular-nums">{p.season}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleExpand(p.id)}
                        className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        {isExpanded ? "Hide Layout" : "View Layout"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(p)}
                        disabled={isLoading}
                        className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 pt-3">
                      {isLoading ? (
                        <p className="text-xs text-slate-400">Loading elements…</p>
                      ) : elements && elements.length > 0 ? (
                        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {elements.map((el, idx) => (
                            <li
                              key={idx}
                              className="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                            >
                              <span className="font-bold text-slate-400">{idx + 1}.</span>
                              <span className="font-semibold text-slate-800">
                                {el.element_code}
                              </span>
                              {el.is_second_half_bonus && (
                                <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
                                  +1.1x
                                </span>
                              )}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-xs text-slate-400">No elements saved in this layout.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
