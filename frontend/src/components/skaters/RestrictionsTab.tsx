import { useState } from "react";
import type { SkaterRestriction } from "@/lib/types";
import { resolveRestriction } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddRestrictionModal } from "./AddRestrictionModal";

interface Props {
  skaterId: number;
  restrictions: SkaterRestriction[];
  onChanged: () => void;
}

/** Health & Load tab: active restrictions itemized as cards. */
export function RestrictionsTab({ skaterId, restrictions, onChanged }: Props) {
  const { token } = useAuth();
  const [adding, setAdding] = useState(false);

  async function resolve(id?: string) {
    if (!id) return;
    await resolveRestriction(skaterId, id, token);
    onChanged();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">
          Active restrictions
        </h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm
            font-medium text-slate-700 hover:bg-slate-50"
        >
          + Add Restriction
        </button>
      </div>

      {restrictions.length === 0 ? (
        <p className="text-sm text-slate-400">
          Cleared for standard load — no active restrictions.
        </p>
      ) : (
        <ul className="space-y-2">
          {restrictions.map((r, index) => (
            <li key={r.id ?? index}>
              <Card>
                <CardContent className="space-y-1 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{r.title}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="danger">{r.status}</Badge>
                      <button
                        type="button"
                        onClick={() => resolve(r.id)}
                        className="text-xs font-medium text-slate-500
                          hover:text-slate-700"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                  {r.restrictions && (
                    <p className="text-sm text-slate-600">{r.restrictions}</p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <AddRestrictionModal
        skaterId={skaterId}
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={onChanged}
      />
    </div>
  );
}
