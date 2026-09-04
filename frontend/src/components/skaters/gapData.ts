import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getGapAnalysis } from "@/lib/api";
import type { GapReport } from "@/lib/types";

// Canonical display order and labels for the four development pillars.
export const PILLAR_LABELS: Record<string, string> = {
  technical: "Technical",
  skating_skills: "Skating Skills",
  physical: "Physical",
  mental: "Mental",
};

export const STATUS_LABELS: Record<string, string> = {
  met: "Met",
  developing: "Developing",
  not_started: "Not started",
};

// Slate-neutral base with semantic accents for each assessment status.
export const STATUS_CLASSES: Record<string, string> = {
  met: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  developing: "bg-amber-50 text-amber-700 ring-amber-600/20",
  not_started: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function statusClass(status: string): string {
  return STATUS_CLASSES[status] ?? STATUS_CLASSES.not_started;
}

/** Fetch the benchmark gap report; a 404 means no standard is set. */
export function useGapReport(skaterId: number | string) {
  const { token } = useAuth();
  const [report, setReport] = useState<GapReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getGapAnalysis(skaterId, token)
      .then((data) => {
        setReport(data);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [skaterId, token]);

  useEffect(() => {
    load();
  }, [load]);

  return { report, loading, error };
}
