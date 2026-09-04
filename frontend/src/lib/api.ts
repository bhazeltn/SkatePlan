import type {
  DashboardSummary,
  Federation,
  LoginResponse,
  OrchestrateSkaterPayload,
  OrchestrateSkaterResponse,
  RegisterCoachPayload,
  Skater,
} from "@/lib/types";

// Base URL points at the live backend by default (same origin in production).
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new ApiError(res.status, detail?.detail ?? "Request failed");
  }
  return (await res.json()) as T;
}

// Real endpoint per backend contract: POST /api/auth/login.
export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// Public self-service coach account creation: POST /api/auth/register.
export function registerCoach(
  payload: RegisterCoachPayload
): Promise<LoginResponse> {
  return request<LoginResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function orchestrateSkater(
  payload: OrchestrateSkaterPayload,
  token?: string | null
): Promise<OrchestrateSkaterResponse> {
  return request<OrchestrateSkaterResponse>(
    "/api/skaters/orchestrate",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

export function listSkaters(token?: string | null): Promise<Skater[]> {
  return request<Skater[]>("/api/skaters", {}, token);
}

// Reference list for the onboarding federation combobox: GET /api/federations.
export function listFederations(token?: string | null): Promise<Federation[]> {
  return request<Federation[]>("/api/federations", {}, token);
}

// Aggregated coach Action & Risk Hub: GET /api/dashboard.
export function getDashboard(token?: string | null): Promise<DashboardSummary> {
  return request<DashboardSummary>("/api/dashboard", {}, token);
}
