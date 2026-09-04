import type { ChangeEvent } from "react";
import { Input, Label } from "./input";

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  error?: string;
  autoComplete?: string;
}

/** Labeled input with an optional inline (rose) validation message. */
export function Field({ id, label, value, onChange, type, error, autoComplete }: FieldProps) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type ?? "text"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
