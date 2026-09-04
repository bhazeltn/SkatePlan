import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getGapAnalysis,
  listBenchmarkTemplates,
  listSkaters,
  saveGapAssessment,
} from "@/lib/api";
import type {
  BenchmarkTemplate,
  SavedGapAssessment,
  Skater,
} from "@/lib/types";

/** Owns all Gap Analysis assessment state: reference data, the working score
 *  draft, submission and the latest saved result. Keeps the page presentational. */
export function useGapAssessment(initialSkaterId?: string) {
  const { token } = useAuth();
  const [skaters, setSkaters] = useState<Skater[]>([]);
  const [templates, setTemplates] = useState<BenchmarkTemplate[]>([]);
  const [skaterId, setSkaterId] = useState(initialSkaterId ?? "");
  const [framework, setFramework] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SavedGapAssessment | null>(null);

  useEffect(() => {
    listSkaters(token).then(setSkaters).catch(() => setSkaters([]));
    listBenchmarkTemplates(token).then(setTemplates).catch(() => setTemplates([]));
  }, [token]);

  useEffect(() => {
    if (!skaterId) return;
    getGapAnalysis(skaterId, token)
      .then((r) => setResult(r.latest_assessment ?? null))
      .catch(() => setResult(null));
  }, [skaterId, token]);

  const setScore = useCallback(
    (pillar: string, level: string) =>
      setScores((prev) => ({ ...prev, [pillar]: level })),
    []
  );

  const submit = useCallback(async () => {
    if (!skaterId || !framework) return;
    setSaving(true);
    try {
      const evaluation_date = new Date().toISOString().slice(0, 10);
      const res = await saveGapAssessment(
        skaterId,
        { benchmark_framework: framework, evaluation_date, pillar_scores: scores, coach_notes: notes },
        token
      );
      setResult(res.latest_assessment);
    } finally {
      setSaving(false);
    }
  }, [skaterId, framework, scores, notes, token]);

  return {
    skaters, templates, skaterId, setSkaterId, framework, setFramework,
    scores, setScore, notes, setNotes, saving, submit, result,
  };
}
