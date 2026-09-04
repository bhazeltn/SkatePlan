import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Skater } from "@/lib/types";
import { listSkaters } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/** Entry point for LTD Exit Standard gap analysis: pick a skater to open their
 *  Gap Analysis tab on the profile hub. */
export function GapAnalysisPage() {
  const { token } = useAuth();
  const [skaters, setSkaters] = useState<Skater[]>([]);

  useEffect(() => {
    let active = true;
    listSkaters(token)
      .then((rows) => active && setSkaters(rows))
      .catch(() => active && setSkaters([]));
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gap Analysis</h1>
        <p className="text-sm text-slate-500">
          Select a skater to review their LTD Exit Standard assessment.
        </p>
      </div>
      {skaters.length === 0 ? (
        <p className="text-sm text-slate-400">No skaters on your roster yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
          {skaters.map((skater) => (
            <li key={skater.skater_id}>
              <Link
                to={`/skaters/${skater.skater_id}`}
                className="flex items-center justify-between gap-3 px-4 py-3
                  text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">
                  {skater.first_name} {skater.last_name}
                </span>
                <span className="text-xs text-slate-500">
                  {skater.competitive_level ?? skater.level_name ?? "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
