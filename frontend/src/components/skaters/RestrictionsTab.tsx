import type { SkaterRestriction } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** Health & Load tab: active restrictions itemized as cards. */
export function RestrictionsTab({
  restrictions,
}: {
  restrictions: SkaterRestriction[];
}) {
  if (restrictions.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Cleared for standard load — no active restrictions.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {restrictions.map((r, index) => (
        <li key={index}>
          <Card>
            <CardContent className="space-y-1 pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{r.title}</p>
                <Badge variant="danger">{r.status}</Badge>
              </div>
              {r.restrictions && (
                <p className="text-sm text-slate-600">{r.restrictions}</p>
              )}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
