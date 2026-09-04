import type { Skater } from "@/lib/types";
import { SkaterCard } from "@/components/skaters/SkaterCard";

export function RosterSection({ skaters }: { skaters: Skater[] }) {
  return (
    <section aria-label="Skater Roster" className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Roster</h2>
      {skaters.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          No skaters on your roster yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skaters.map((s) => (
            <SkaterCard key={s.skater_id} skater={s} />
          ))}
        </div>
      )}
    </section>
  );
}
