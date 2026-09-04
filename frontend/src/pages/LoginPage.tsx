import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

function useLogin() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      navigate("/", { replace: true });
    } catch {
      setError("Invalid email or password.");
    } finally {
      setBusy(false);
    }
  }
  return { email, setEmail, password, setPassword, error, busy, onSubmit };
}

function LoginForm(l: ReturnType<typeof useLogin>) {
  return (
    <form onSubmit={l.onSubmit} className="space-y-4" noValidate>
      <Field id="email" label="Email" type="email" value={l.email}
        autoComplete="email" onChange={(e) => l.setEmail(e.target.value)} />
      <Field id="password" label="Password" type="password" value={l.password}
        autoComplete="current-password" onChange={(e) => l.setPassword(e.target.value)} />
      <Button type="submit" className="w-full" disabled={l.busy}>
        {l.busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export function LoginPage() {
  const login = useLogin();
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <h1 className="mb-1 text-xl font-bold text-slate-900">Sign in</h1>
          <p className="mb-4 text-sm text-slate-500">Coach & staff access</p>
          {login.error && (
            <Alert variant="danger" className="mb-4">{login.error}</Alert>
          )}
          <LoginForm {...login} />
          <p className="mt-4 text-center text-sm text-slate-500">
            Need to onboard a skater?{" "}
            <Link to="/register" className="font-medium text-blue-600">Register</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
