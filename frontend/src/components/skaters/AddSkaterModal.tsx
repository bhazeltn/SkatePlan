import { useState, type FormEvent } from "react";
import { orchestrateSkater } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

interface SkaterFields {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  training_unit: string;
  guardian: string;
}

const EMPTY: SkaterFields = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  training_unit: "",
  guardian: "",
};

const FIELDS: { key: keyof SkaterFields; label: string; type?: string }[] = [
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "date_of_birth", label: "Date of birth", type: "date" },
  { key: "training_unit", label: "Training unit" },
  { key: "guardian", label: "Parent/guardian email", type: "email" },
];

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

function useAddSkater({ onClose, onCreated }: ModalProps) {
  // coach_id is derived from the authenticated session — never a manual input.
  const { token, userId } = useAuth();
  const [fields, setFields] = useState<SkaterFields>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: keyof SkaterFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (userId === null) return;
    setError(null);
    setBusy(true);
    try {
      await orchestrateSkater(
        {
          first_name: fields.first_name,
          last_name: fields.last_name,
          date_of_birth: fields.date_of_birth,
          unit_name: fields.training_unit,
          coach_user_id: userId,
          role_in_unit: "primary",
        },
        token
      );
      setFields(EMPTY);
      onCreated?.();
      onClose();
    } catch {
      setError("Could not add the skater. Please review the details and retry.");
    } finally {
      setBusy(false);
    }
  }
  return { fields, error, busy, update, onSubmit };
}

export function AddSkaterModal(props: ModalProps) {
  const { open, onClose } = props;
  const state = useAddSkater(props);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-skater-title"
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="add-skater-title"
          className="mb-4 text-lg font-bold text-slate-900"
        >
          Add Skater
        </h2>
        {state.error && (
          <Alert variant="danger" className="mb-4">
            {state.error}
          </Alert>
        )}
        <form onSubmit={state.onSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FIELDS.map(({ key, label, type }) => (
              <Field
                key={key}
                id={`skater-${key}`}
                label={label}
                type={type}
                value={state.fields[key]}
                onChange={(e) => state.update(key, e.target.value)}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={state.busy}>
              {state.busy ? "Creating…" : "Create skater"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
