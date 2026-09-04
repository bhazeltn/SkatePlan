import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { orchestrateSkater } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import {
  EMPTY_FIELDS,
  buildPayload,
  isMinor,
  validate,
  type RegisterFields,
} from "./registerForm";

const FIELD_DEFS: { key: keyof RegisterFields; label: string; type?: string }[] = [
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "email", label: "Email", type: "email" },
  { key: "password", label: "Password", type: "password" },
  { key: "date_of_birth", label: "Date of birth", type: "date" },
  { key: "unit_name", label: "Training unit" },
  { key: "coach_user_id", label: "Coach ID", type: "number" },
];

function useRegister() {
  const { token } = useAuth();
  const [fields, setFields] = useState<RegisterFields>(EMPTY_FIELDS);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  const update = (key: keyof RegisterFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validate(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await orchestrateSkater(buildPayload(fields), token);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }
  return { fields, errors, status, update, onSubmit };
}

type RegisterState = ReturnType<typeof useRegister>;

function RegisterForm({ fields, errors, update, onSubmit }: RegisterState) {
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELD_DEFS.map(({ key, label, type }) => (
          <Field key={key} id={key} label={label} type={type}
            value={fields[key]} error={errors[key]}
            onChange={(e) => update(key, e.target.value)} />
        ))}
      </div>
      {isMinor(fields.date_of_birth) && (
        <Field id="guardian_email" label="Guardian email (minor — parent proxy)"
          type="email" value={fields.guardian_email}
          onChange={(e) => update("guardian_email", e.target.value)} />
      )}
      <Button type="submit" className="w-full">Create skater</Button>
    </form>
  );
}

export function RegisterPage() {
  const state = useRegister();
  return (
    <div className="mx-auto max-w-lg p-4">
      <Card>
        <CardContent className="pt-6">
          <h1 className="mb-1 text-xl font-bold text-slate-900">Register skater</h1>
          <p className="mb-4 text-sm text-slate-500">SafeSport-compliant onboarding</p>
          {state.status === "ok" && (
            <Alert variant="success" className="mb-4">Skater onboarded successfully.</Alert>
          )}
          {state.status === "error" && (
            <Alert variant="danger" className="mb-4">Onboarding failed. Please review and retry.</Alert>
          )}
          <RegisterForm {...state} />
          <p className="mt-4 text-center text-sm text-slate-500">
            <Link to="/login" className="font-medium text-blue-600">Back to sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
