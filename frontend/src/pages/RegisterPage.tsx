import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerCoach } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

interface CoachFields {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  club: string;
}

const EMPTY: CoachFields = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  club: "",
};

const FIELDS: {
  key: keyof CoachFields;
  label: string;
  type?: string;
  auto?: string;
}[] = [
  { key: "first_name", label: "First name", auto: "given-name" },
  { key: "last_name", label: "Last name", auto: "family-name" },
  { key: "email", label: "Email", type: "email", auto: "email" },
  { key: "password", label: "Password", type: "password", auto: "new-password" },
  { key: "club", label: "Club (optional)", auto: "organization" },
];

function useRegister() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState<CoachFields>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: keyof CoachFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await registerCoach({
        first_name: fields.first_name,
        last_name: fields.last_name,
        email: fields.email,
        password: fields.password,
        club: fields.club || undefined,
      });
      await signIn(fields.email, fields.password);
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Could not create your account. Please review your details and retry.");
    } finally {
      setBusy(false);
    }
  }
  return { fields, error, busy, update, onSubmit };
}

function RegisterForm({
  fields,
  busy,
  update,
  onSubmit,
}: ReturnType<typeof useRegister>) {
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map(({ key, label, type, auto }) => (
          <Field
            key={key}
            id={key}
            label={label}
            type={type}
            autoComplete={auto}
            value={fields[key]}
            onChange={(e) => update(key, e.target.value)}
          />
        ))}
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

export function RegisterPage() {
  const state = useRegister();
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6">
          <h1 className="mb-1 text-xl font-bold text-slate-900">
            Create Coach Account
          </h1>
          <p className="mb-4 text-sm text-slate-500">
            Set up your coaching workspace
          </p>
          {state.error && (
            <Alert variant="danger" className="mb-4">
              {state.error}
            </Alert>
          )}
          <RegisterForm {...state} />
          <p className="mt-4 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-blue-600">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
