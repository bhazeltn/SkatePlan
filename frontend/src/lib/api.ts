import type {
  DashboardSummary,
  Federation,
  GapReport,
  LoginResponse,
  OrchestrateSkaterPayload,
  OrchestrateSkaterResponse,
  ProgramCreatePayload,
  RegisterCoachPayload,
  RestrictionCreatePayload,
  Skater,
  SkaterDetail,
  SovElement,
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

// Full profile hub payload: GET /api/skaters/{id}.
export function getSkater(
  id: number | string,
  token?: string | null
): Promise<SkaterDetail> {
  return request<SkaterDetail>(`/api/skaters/${id}`, {}, token);
}

// Singles Scale of Values reference for the program builder: GET /api/sov/elements.
// When plannedOnly is true, execution-flag scored variants are excluded server-side.
export function listSovElements(
  token?: string | null,
  plannedOnly = false
): Promise<SovElement[]> {
  const query = plannedOnly ? "?planned_only=true" : "";
  return request<SovElement[]>(`/api/sov/elements${query}`, {}, token);
}

// LTD Exit Standard gap report for a skater: GET /api/skaters/{id}/gap-analysis.
export function getGapAnalysis(
  skaterId: number | string,
  token?: string | null
): Promise<GapReport> {
  return request<GapReport>(`/api/skaters/${skaterId}/gap-analysis`, {}, token);
}

// Persist a new program layout: POST /api/programs.
export function createProgram(
  payload: ProgramCreatePayload,
  token?: string | null
): Promise<{ id: string }> {
  return request<{ id: string }>(
    "/api/programs",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

// Reference list for the onboarding federation combobox: GET /api/federations.
export function listFederations(token?: string | null): Promise<Federation[]> {
  return request<Federation[]>("/api/federations", {}, token);
}

// Aggregated coach Action & Risk Hub: GET /api/dashboard.
export function getDashboard(token?: string | null): Promise<DashboardSummary> {
  return request<DashboardSummary>("/api/dashboard", {}, token);
}

// Log an active load restriction: POST /api/skaters/{id}/restrictions.
export function createRestriction(
  skaterId: number | string,
  payload: RestrictionCreatePayload,
  token?: string | null
): Promise<{ id: string }> {
  return request<{ id: string }>(
    `/api/skaters/${skaterId}/restrictions`,
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

// Resolve an active restriction: DELETE /api/skaters/{id}/restrictions/{rid}.
export function resolveRestriction(
  skaterId: number | string,
  restrictionId: string,
  token?: string | null
): Promise<{ id: string }> {
  return request<{ id: string }>(
    `/api/skaters/${skaterId}/restrictions/${restrictionId}`,
    { method: "DELETE" },
    token
  );
}
