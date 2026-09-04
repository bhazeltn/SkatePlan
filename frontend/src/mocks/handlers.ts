import { http, HttpResponse } from "msw";
import type { Skater } from "@/lib/types";

// A minimal JWT-looking token (header.payload.signature) with role claim so the
// client can decode role locally. Not cryptographically valid — tests only.
function fakeJwt(userId: number, role: string): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ user_id: userId, system_role: role }));
  return `${header}.${payload}.sig`;
}

// Federations served by GET /api/federations. Intentionally NOT in country
// order so the combobox's alphabetical-by-country sort is exercised by tests.
export const mockFederations = [
  { id: 1, name: "Philippine Skating Union", code: "PHI", country: "Philippines" },
  { id: 2, name: "Skate Canada", code: "CAN", country: "Canada" },
  { id: 3, name: "U.S. Figure Skating", code: "USA", country: "United States" },
  { id: 4, name: "Australian Ice Skating Association", code: "AUS", country: "Australia" },
];

export const mockSkaters: Skater[] = [
  {
    skater_id: 1,
    first_name: "Ava",
    last_name: "Nguyen",
    home_club: "Glacier FSC",
    level_name: "Senior",
    competitive_level: "Senior",
    federation_name: "Philippine Skating Union",
    country_code: "ph",
    weekly_ice_minutes: 540,
    has_active_restriction: true,
  },
  {
    skater_id: 2,
    first_name: "Liam",
    last_name: "Torres",
    home_club: "Summit SC",
    level_name: "Junior",
    competitive_level: "Junior",
    federation_name: "Skate Canada",
    country_code: "ca",
    weekly_ice_minutes: 420,
    has_active_restriction: false,
  },
];

// Singles Scale of Values lookup served by GET /api/sov/elements. Includes a
// few execution-flag variants so planned_only filtering can be exercised.
export const mockSovElements = [
  { element_code: "3Lz", element_name: "Triple Lutz", base_value: 5.9 },
  { element_code: "2A", element_name: "Double Axel", base_value: 3.3 },
  { element_code: "3T", element_name: "Triple Toeloop", base_value: 4.2 },
  { element_code: "CCoSp4", element_name: "Change Combo Spin L4", base_value: 3.5 },
  { element_code: "StSq3", element_name: "Step Sequence L3", base_value: 3.3 },
  { element_code: "2Aq", element_name: "Double Axel (q)", base_value: 3.3 },
  { element_code: "3T<", element_name: "Triple Toeloop (UR)", base_value: 2.94 },
];

// Step/choreo sequences legitimately contain "q"; only true execution-flag
// variants should be filtered when planned_only is requested.
function isFlaggedCode(code: string): boolean {
  const stripped = code.replace(/StSq|ChSq/g, "");
  return /[<>qe!*]/.test(stripped);
}

// Gap report served by GET /api/skaters/:id/gap-analysis.
export const mockGapReport = {
  skater_id: 1,
  target_standard_id: 7,
  pillars: {
    technical: [
      {
        benchmark_id: 1,
        title: "Land 2A clean",
        evaluation_mode: "binary",
        status: "developing",
        measured: 0,
        target: 1,
        delta: 1,
      },
      {
        benchmark_id: 2,
        title: "Triple Toeloop base value",
        evaluation_mode: "numeric",
        status: "met",
        measured: 4.2,
        target: 4.0,
        delta: 0.2,
      },
    ],
    skating_skills: [
      {
        benchmark_id: 3,
        title: "Step Sequence Level 3",
        evaluation_mode: "level",
        status: "not_started",
        measured: 1,
        target: 3,
        delta: 2,
      },
    ],
    physical: [],
    mental: [],
  },
  latest_assessment: null,
};

// Federation-neutral benchmark templates served by GET /api/standards/templates.
export const mockTemplates = [
  {
    key: "novice",
    level: "Novice",
    label: "Novice Level Benchmark Standard - Development Track",
    pillar_targets: {
      technical: "Meeting Standard",
      skating_skills: "Meeting Standard",
      physical: "Meeting Standard",
      performance: "Meeting Standard",
    },
  },
  {
    key: "junior",
    level: "Junior",
    label: "Junior Level Benchmark Standard - International Track",
    pillar_targets: {
      technical: "Meeting Standard",
      skating_skills: "Meeting Standard",
      physical: "Meeting Standard",
      performance: "Meeting Standard",
    },
  },
  {
    key: "senior",
    level: "Senior",
    label: "Senior Level Benchmark Standard - Elite Track",
    pillar_targets: {
      technical: "Meeting Standard",
      skating_skills: "Meeting Standard",
      physical: "Meeting Standard",
      performance: "Meeting Standard",
    },
  },
];

const SCORE_RANK: Record<string, number> = {
  "Not Introduced": 0,
  Acquiring: 1,
  "Meeting Standard": 2,
  Exceeding: 3,
};

// Deterministic delta-flag computation mirroring the backend contract.
function buildAssessment(id: number, body: Record<string, unknown>) {
  const scores = (body.pillar_scores ?? {}) as Record<string, string>;
  const flags = Object.keys(scores).map((pillar) => ({
    pillar,
    score: scores[pillar],
    target: "Meeting Standard",
    met: (SCORE_RANK[scores[pillar]] ?? 0) >= 2,
  }));
  return {
    id: "saved-1",
    skater_id: id,
    benchmark_framework: body.benchmark_framework,
    evaluation_date: body.evaluation_date,
    pillar_scores: scores,
    coach_notes: body.coach_notes ?? "",
    delta_flags: flags,
    gaps_identified: flags.filter((f) => !f.met).length,
    benchmarks_met: flags.filter((f) => f.met).length,
  };
}

// Sprint 6 coach-driven custom benchmarks served by
// GET /api/skaters/:id/benchmarks. Empty by default so views render the
// empty state; CRUD-flow tests override with server.use().
export const mockBenchmarks: unknown[] = [];

// Full skater profile served by GET /api/skaters/:id.
export const mockSkaterDetail = {
  skater_id: 1,
  first_name: "Ava",
  last_name: "Nguyen",
  home_club: "Glacier FSC",
  competitive_level: "Senior",
  federation_name: "Philippine Skating Union",
  country_code: "ph",
  has_active_restriction: true,
  restrictions: [
    {
      id: "r-ankle",
      title: "Ankle sprain",
      restrictions: "Triple jump restriction / No impact landing",
      status: "active",
    },
  ],
  programs: [
    { id: "p-fs", program_type: "FS", title: "Free Skate 2026", season: "2025-26" },
  ],
};

// Aggregated Action & Risk Hub payload served by GET /api/dashboard.
// Competitions are intentionally out of date order so the UI's ascending sort
// is exercised by the test suite.
export const mockDashboard = {
  roster: [
    {
      skater_id: 1,
      first_name: "Ava",
      last_name: "Nguyen",
      home_club: "Glacier FSC",
      level_name: "Senior",
      competitive_level: "Senior",
      federation_name: "Philippine Skating Union",
      country_code: "ph",
      has_active_restriction: true,
    },
    {
      skater_id: 2,
      first_name: "Liam",
      last_name: "Torres",
      home_club: "Summit SC",
      level_name: "Junior",
      competitive_level: "Junior",
      federation_name: "Skate Canada",
      country_code: "ca",
      has_active_restriction: false,
    },
  ],
  alerts: [
    {
      kind: "missing_plan",
      skater_id: 2,
      skater_name: "Liam Torres",
      message: "Missing Short/Free layout",
      severity: "warning",
    },
    {
      kind: "at_risk_goal",
      skater_id: 1,
      skater_name: "Ava Nguyen",
      message: "Axel benchmark behind schedule",
      severity: "warning",
    },
  ],
  restrictions: [
    {
      skater_id: 1,
      skater_name: "Ava Nguyen",
      title: "Ankle sprain",
      restrictions: "Triple jump restriction / No impact landing",
      status: "active",
    },
  ],
  upcoming_competitions: [
    {
      competition_id: "c-winter",
      name: "Winter Open",
      start_date: "2026-12-05",
      entry_status: "prospective",
      skater_names: ["Liam Torres"],
    },
    {
      competition_id: "c-autumn",
      name: "Autumn Classic",
      start_date: "2026-10-01",
      entry_status: "confirmed",
      skater_names: ["Ava Nguyen"],
    },
  ],
};

// Both the real client and the mock use /api/auth/login. A /api/auth/token
// alias is also provided for compatibility with the sprint spec text.
const loginResolver = async ({ request }: { request: Request }) => {
  const body = (await request.json()) as { email: string; password: string };
  if (body.password === "wrong" || !body.email) {
    return HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 });
  }
  return HttpResponse.json({
    access_token: fakeJwt(10, "coach"),
    token_type: "bearer",
    user_id: 10,
    role: "coach",
  });
};

export const handlers = [
  http.post("*/api/auth/login", loginResolver),
  http.post("*/api/auth/token", loginResolver),
  http.post("*/api/auth/register", async ({ request }) => {
    const body = (await request.json()) as { email?: string };
    if (!body.email) {
      return HttpResponse.json({ detail: "Invalid registration" }, { status: 400 });
    }
    return HttpResponse.json(
      {
        access_token: fakeJwt(10, "coach"),
        token_type: "bearer",
        user_id: 10,
        role: "coach",
      },
      { status: 201 }
    );
  }),
  http.post("*/api/skaters/orchestrate", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.date_of_birth || !body.coach_user_id) {
      return HttpResponse.json({ detail: "Missing fields" }, { status: 400 });
    }
    return HttpResponse.json(
      {
        skater_id: 99,
        training_unit_id: 5,
        roster_entry_id: 7,
        assignment_id: 3,
      },
      { status: 201 }
    );
  }),
  http.get("*/api/federations", () => HttpResponse.json(mockFederations)),
  http.get("*/api/sov/elements", ({ request }) => {
    const plannedOnly =
      new URL(request.url).searchParams.get("planned_only") === "true";
    const rows = plannedOnly
      ? mockSovElements.filter((e) => !isFlaggedCode(e.element_code))
      : mockSovElements;
    return HttpResponse.json(rows);
  }),
  http.get("*/api/standards/templates", () =>
    HttpResponse.json(mockTemplates)
  ),
  http.post("*/api/skaters/:id/gap-analysis", async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const id = Number(params.id);
    return HttpResponse.json(
      { latest_assessment: buildAssessment(id, body) },
      { status: 201 }
    );
  }),
  http.get("*/api/skaters/:id/gap-analysis", () =>
    HttpResponse.json(mockGapReport)
  ),
  // Sprint 6: fully coach-driven custom benchmarks. Stateful in-memory store so
  // existing views that fetch benchmarks don't hit unhandled requests. Tests
  // that exercise the CRUD flow override these via server.use().
  http.get("*/api/skaters/:id/benchmarks", () =>
    HttpResponse.json(mockBenchmarks)
  ),
  http.post("*/api/skaters/:id/benchmarks", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: "bench-new", ...body }, { status: 201 });
  }),
  http.patch("*/api/skaters/:id/benchmarks/:bid", async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: params.bid, ...body });
  }),
  http.delete("*/api/skaters/:id/benchmarks/:bid", () =>
    new HttpResponse(null, { status: 204 })
  ),
  http.get("*/api/skaters/:id", () => HttpResponse.json(mockSkaterDetail)),
  http.get("*/api/skaters", () => HttpResponse.json(mockSkaters)),
  http.post("*/api/programs", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: "new-prog", ...body }, { status: 201 });
  }),
  http.get("*/api/dashboard", () => HttpResponse.json(mockDashboard)),
];
