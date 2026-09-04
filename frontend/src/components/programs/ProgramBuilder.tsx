import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createProgram, listSovElements } from "@/lib/api";
import type { SovElement } from "@/lib/types";
import { toCatalog, totalBaseValue, type PlannedElement } from "@/lib/sov";
import { ElementSearch } from "@/components/programs/ElementSearch";
import { ElementSlots } from "@/components/programs/ElementSlots";
import { TotalBar } from "@/components/programs/TotalBar";

type Segment = "SP" | "FS";
const TITLES: Record<Segment, string> = { SP: "Short Program", FS: "Free Skate" };

/** Deterministic program sandbox: pick a segment, add SOV elements, toggle the
 *  second-half bonus, watch the running base value, and persist the layout. */
export function ProgramBuilder({
  skaterId,
  onSaved,
}: {
  skaterId: number;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [sov, setSov] = useState<SovElement[]>([]);
  const [segment, setSegment] = useState<Segment>("SP");
  const [elements, setElements] = useState<PlannedElement[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    listSovElements(token)
      .then((rows) => active && setSov(rows))
      .catch(() => active && setSov([]));
    return () => {
      active = false;
    };
  }, [token]);

  const catalog = useMemo(() => toCatalog(sov), [sov]);
  const total = totalBaseValue(elements, catalog);

  function addElement(code: string) {
    setElements((prev) => [...prev, { element_code: code, is_second_half_bonus: false }]);
  }
  function toggle(index: number) {
    setElements((prev) =>
      prev.map((el, i) =>
        i === index ? { ...el, is_second_half_bonus: !el.is_second_half_bonus } : el
      )
    );
  }
  function remove(index: number) {
    setElements((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setSaving(true);
    try {
      await createProgram(
        {
          skater_id: skaterId,
          program_type: segment,
          title: TITLES[segment],
          program_elements: elements.map((el, i) => ({
            segment_order: i + 1,
            element_code: el.element_code,
            is_second_half_bonus: el.is_second_half_bonus,
          })),
        },
        token
      );
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <SegmentSelector segment={segment} onChange={setSegment} />
      <ElementSearch elements={sov} onAdd={addElement} />
      <ElementSlots
        elements={elements}
        catalog={catalog}
        onToggle={toggle}
        onRemove={remove}
      />
      <TotalBar total={total} />
      <button
        type="button"
        onClick={save}
        disabled={saving || elements.length === 0}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold
          text-white hover:bg-slate-800 disabled:opacity-50"
      >
        Save Program
      </button>
    </section>
  );
}

function SegmentSelector({
  segment,
  onChange,
}: {
  segment: Segment;
  onChange: (s: Segment) => void;
}) {
  return (
    <fieldset className="flex gap-4">
      <legend className="mb-2 text-sm font-medium text-slate-600">Segment</legend>
      {(Object.keys(TITLES) as Segment[]).map((key) => (
        <label key={key} className="flex items-center gap-2 text-sm text-slate-800">
          <input
            type="radio"
            name="segment"
            checked={segment === key}
            onChange={() => onChange(key)}
          />
          {TITLES[key]}
        </label>
      ))}
    </fieldset>
  );
}
