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

// Singles Scale of Values lookup served by GET /api/sov/elements.
export const mockSovElements = [
  { element_code: "3Lz", element_name: "Triple Lutz", base_value: 5.9 },
  { element_code: "2A", element_name: "Double Axel", base_value: 3.3 },
  { element_code: "3T", element_name: "Triple Toeloop", base_value: 4.2 },
  { element_code: "CCoSp4", element_name: "Change Combo Spin L4", base_value: 3.5 },
  { element_code: "StSq3", element_name: "Step Sequence L3", base_value: 3.3 },
];

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
  http.get("*/api/sov/elements", () => HttpResponse.json(mockSovElements)),
  http.get("*/api/skaters/:id", () => HttpResponse.json(mockSkaterDetail)),
  http.get("*/api/skaters", () => HttpResponse.json(mockSkaters)),
  http.post("*/api/programs", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: "new-prog", ...body }, { status: 201 });
  }),
  http.get("*/api/dashboard", () => HttpResponse.json(mockDashboard)),
];
