import { useState, type FormEvent } from "react";
import { orchestrateSkater } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { FederationCombobox } from "./FederationCombobox";
import {
  EMPTY_SKATER,
  LEVELS,
  isMinor,
  type SkaterFields,
} from "./skaterForm";
import type { Federation, OrchestrateSkaterPayload } from "@/lib/types";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const TEXT_FIELDS: { key: keyof SkaterFields; label: string; type?: string }[] = [
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "date_of_birth", label: "Date of birth", type: "date" },
  { key: "home_club", label: "Home Club / Rink" },
];

function buildPayload(
  f: SkaterFields,
  fedId: number | null,
  userId: number
): OrchestrateSkaterPayload {
  const minor = isMinor(f.date_of_birth);
  const email = (minor ? f.guardian_email : f.skater_email).trim();
  return {
    first_name: f.first_name,
    last_name: f.last_name,
    date_of_birth: f.date_of_birth,
    home_club: f.home_club || undefined,
    federation_id: fedId ?? undefined,
    competitive_level: f.competitive_level || undefined,
    // Coach-provided contact email; stored on the profile, no login account.
    contact_email: email || undefined,
    coach_user_id: userId,
    role_in_unit: "primary",
  };
}

function useAddSkater({ onClose, onCreated }: ModalProps) {
  // coach_id is derived from the authenticated session — never a manual input.
  const { token, userId } = useAuth();
  const [fields, setFields] = useState<SkaterFields>(EMPTY_SKATER);
  const [fedId, setFedId] = useState<number | null>(null);
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
      await orchestrateSkater(buildPayload(fields, fedId, userId), token);
      setFields(EMPTY_SKATER);
      setFedId(null);
      onCreated?.();
      onClose();
    } catch {
      setError("Could not add the skater. Please review the details and retry.");
    } finally {
      setBusy(false);
    }
  }
  return { fields, error, busy, token, update, setFedId, onSubmit };
}

function LevelSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor="skater-competitive_level">Competitive Level</Label>
      <select
        id="skater-competitive_level"
        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select level…</option>
        {LEVELS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function EmailFields({
  fields,
  update,
}: {
  fields: SkaterFields;
  update: (key: keyof SkaterFields, value: string) => void;
}) {
  const minor = isMinor(fields.date_of_birth);
  return (
    <>
      {minor && (
        <Field
          id="skater-guardian_email"
          label="Parent/Guardian Email"
          type="email"
          required
          value={fields.guardian_email}
          onChange={(e) => update("guardian_email", e.target.value)}
        />
      )}
      <Field
        id="skater-skater_email"
        label="Skater Email"
        type="email"
        required={!minor}
        value={fields.skater_email}
        onChange={(e) => update("skater_email", e.target.value)}
      />
    </>
  );
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
        <h2 id="add-skater-title" className="mb-4 text-lg font-bold text-slate-900">
          Add Skater
        </h2>
        {state.error && (
          <Alert variant="danger" className="mb-4">
            {state.error}
          </Alert>
        )}
        <form onSubmit={state.onSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {TEXT_FIELDS.map(({ key, label, type }) => (
              <Field
                key={key}
                id={`skater-${key}`}
                label={label}
                type={type}
                value={state.fields[key]}
                onChange={(e) => state.update(key, e.target.value)}
              />
            ))}
            <LevelSelect
              value={state.fields.competitive_level}
              onChange={(v) => state.update("competitive_level", v)}
            />
            <FederationCombobox
              token={state.token}
              onSelect={(f: Federation | null) =>
                state.setFedId(f ? f.id : null)
              }
            />
            <EmailFields fields={state.fields} update={state.update} />
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
