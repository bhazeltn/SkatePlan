import { useEffect, useMemo, useState } from "react";
import { listFederations } from "@/lib/api";
import { Input, Label } from "@/components/ui/input";
import type { Federation } from "@/lib/types";

interface Props {
  token?: string | null;
  onSelect: (federation: Federation | null) => void;
}

/** Display label as "[Country] — [Federation Name]". */
function optionLabel(f: Federation): string {
  return `${f.country} — ${f.name}`;
}

/** Searchable federation picker; matches on both country and federation name. */
export function FederationCombobox({ token, onSelect }: Props) {
  const [feds, setFeds] = useState<Federation[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    listFederations(token)
      .then((rows) => active && setFeds(rows))
      .catch(() => active && setFeds([]));
    return () => {
      active = false;
    };
  }, [token]);

  const sorted = useMemo(
    () =>
      [...feds].sort(
        (a, b) =>
          a.country.localeCompare(b.country) || a.name.localeCompare(b.name)
      ),
    [feds]
  );
  const needle = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      sorted.filter(
        (f) =>
          f.country.toLowerCase().includes(needle) ||
          f.name.toLowerCase().includes(needle)
      ),
    [sorted, needle]
  );

  function choose(f: Federation) {
    setQuery(optionLabel(f));
    onSelect(f);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Label htmlFor="skater-federation">Federation</Label>
      <Input
        id="skater-federation"
        role="combobox"
        aria-expanded={open}
        aria-controls="federation-listbox"
        autoComplete="off"
        placeholder="Search by country or federation…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onSelect(null);
        }}
      />
      {open && matches.length > 0 && (
        <ul
          id="federation-listbox"
          role="listbox"
          aria-label="Federation results"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-300 bg-white shadow-lg"
        >
          {matches.map((f) => (
            <li
              key={f.id}
              role="option"
              aria-selected={false}
              className="cursor-pointer px-3 py-2 text-sm text-slate-900 hover:bg-slate-100"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(f)}
            >
              {optionLabel(f)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
