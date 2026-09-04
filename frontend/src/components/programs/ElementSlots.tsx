import { X } from "lucide-react";
import { elementTotal, formatBV, type PlannedElement } from "@/lib/sov";

/** Ordered, editable list of planned program elements. */
export function ElementSlots({
  elements,
  catalog,
  onToggle,
  onRemove,
}: {
  elements: PlannedElement[];
  catalog: Map<string, number>;
  onToggle: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  if (elements.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-200 px-3 py-6
        text-center text-sm text-slate-400">
        No elements yet — search above to build the layout.
      </p>
    );
  }
  return (
    <ol className="space-y-2">
      {elements.map((el, index) => (
        <li
          key={index}
          data-testid="element-slot"
          className="flex items-center gap-3 rounded-md border border-slate-200
            px-3 py-2"
        >
          <span className="tabular-nums text-xs font-semibold text-slate-400">
            {index + 1}
          </span>
          <span className="flex-1 text-sm font-medium text-slate-900">
            {el.element_code}
          </span>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              aria-label="Second half bonus"
              checked={el.is_second_half_bonus}
              onChange={() => onToggle(index)}
            />
            Second half
          </label>
          <span className="w-14 text-right tabular-nums text-sm text-slate-700">
            {formatBV(elementTotal(el, catalog))}
          </span>
          <button
            type="button"
            aria-label={`Remove ${el.element_code}`}
            onClick={() => onRemove(index)}
            className="text-slate-400 hover:text-red-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ol>
  );
}
