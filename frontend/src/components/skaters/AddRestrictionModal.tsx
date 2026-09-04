import { useState, type FormEvent } from "react";
import { createRestriction } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { RESTRICTION_TYPES, type RestrictionCreatePayload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

interface ModalProps {
  skaterId: number;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: RestrictionCreatePayload = {
  restriction_type: RESTRICTION_TYPES[0],
  excluded_elements: "",
  review_date: "",
  notes: "",
};

function useRestrictionForm({ skaterId, onClose, onSaved }: ModalProps) {
  const { token } = useAuth();
  const [form, setForm] = useState<RestrictionCreatePayload>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof RestrictionCreatePayload, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await createRestriction(skaterId, form, token);
      setForm(EMPTY);
      onSaved();
      onClose();
    } catch {
      setError("Could not log the restriction. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return { form, error, busy, set, onSubmit };
}

function TypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor="restriction-type">Restriction Type</Label>
      <select
        id="restriction-type"
        className="flex h-10 w-full rounded-md border border-slate-300 bg-white
          px-3 py-2 text-sm text-slate-900 focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {RESTRICTION_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}

function NotesField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor="restriction-notes">Notes / Coach Instructions</Label>
      <textarea
        id="restriction-notes"
        rows={3}
        className="flex w-full rounded-md border border-slate-300 bg-white px-3
          py-2 text-sm text-slate-900 focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function AddRestrictionModal(props: ModalProps) {
  const { open, onClose } = props;
  const s = useRestrictionForm(props);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
        bg-slate-900/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-restriction-title"
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="add-restriction-title"
          className="mb-4 text-lg font-bold text-slate-900"
        >
          Log Load Modification
        </h2>
        {s.error && (
          <Alert variant="danger" className="mb-4">
            {s.error}
          </Alert>
        )}
        <form onSubmit={s.onSubmit} className="space-y-4" noValidate>
          <TypeSelect
            value={s.form.restriction_type}
            onChange={(v) => s.set("restriction_type", v)}
          />
          <Field
            id="restriction-excluded"
            label="Specific Excluded Elements"
            value={s.form.excluded_elements ?? ""}
            onChange={(e) => s.set("excluded_elements", e.target.value)}
          />
          <Field
            id="restriction-review"
            label="Expected Return Date / Review Date"
            type="date"
            value={s.form.review_date ?? ""}
            onChange={(e) => s.set("review_date", e.target.value)}
          />
          <NotesField
            value={s.form.notes ?? ""}
            onChange={(v) => s.set("notes", v)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={s.busy}>
              {s.busy ? "Saving…" : "Add Restriction"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
