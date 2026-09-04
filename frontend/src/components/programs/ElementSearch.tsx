import { useState } from "react";
import type { SovElement } from "@/lib/types";

/** Autocomplete over the Singles SOV catalog. Emits the chosen element code. */
export function ElementSearch({
  elements,
  onAdd,
}: {
  elements: SovElement[];
  onAdd: (code: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q
    ? elements
        .filter(
          (e) =>
            e.element_code.toLowerCase().includes(q) ||
            e.element_name.toLowerCase().includes(q)
        )
        .slice(0, 8)
    : [];

  function choose(code: string) {
    onAdd(code);
    setQuery("");
  }

  return (
    <div className="relative">
      <input
        role="combobox"
        aria-label="Element"
        aria-expanded={matches.length > 0}
        aria-controls="element-options"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search elements (e.g. 3Lz)"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
          text-slate-900 focus:border-slate-500 focus:outline-none"
      />
      {matches.length > 0 && (
        <ul
          id="element-options"
          role="listbox"
          className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border
            border-slate-200 bg-white shadow-lg"
        >
          {matches.map((e) => (
            <li key={e.element_code}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => choose(e.element_code)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2
                  text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">{e.element_code}</span>
                <span className="truncate text-xs text-slate-500">
                  {e.element_name}
                </span>
                <span className="tabular-nums text-xs text-slate-600">
                  {Number(e.base_value).toFixed(2)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
