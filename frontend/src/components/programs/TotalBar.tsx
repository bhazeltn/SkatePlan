import { formatBV } from "@/lib/sov";

/** Sticky running total of planned base value. */
export function TotalBar({ total }: { total: number }) {
  return (
    <div className="flex items-baseline justify-between border-t border-slate-200 pt-3">
      <span className="text-sm font-medium text-slate-600">
        Total planned base value
      </span>
      <span
        data-testid="total-base-value"
        className="tabular-nums font-mono text-lg font-semibold text-slate-900"
      >
        {formatBV(total)}
      </span>
    </div>
  );
}
