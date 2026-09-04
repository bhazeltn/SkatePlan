import { http, HttpResponse } from "msw";
import type { Skater } from "@/lib/types";

// A minimal JWT-looking token (header.payload.signature) with role claim so the
// client can decode role locally. Not cryptographically valid — tests only.
function fakeJwt(userId: number, role: string): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ user_id: userId, system_role: role }));
  return `${header}.${payload}.sig`;
}

export const mockSkaters: Skater[] = [
  {
    skater_id: 1,
    first_name: "Ava",
    last_name: "Nguyen",
    home_club: "Glacier FSC",
    level_name: "Senior",
    weekly_ice_minutes: 540,
    has_active_restriction: true,
  },
  {
    skater_id: 2,
    first_name: "Liam",
    last_name: "Torres",
    home_club: "Summit SC",
    level_name: "Junior",
    weekly_ice_minutes: 420,
    has_active_restriction: false,
  },
];

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
      has_active_restriction: true,
    },
    {
      skater_id: 2,
      first_name: "Liam",
      last_name: "Torres",
      home_club: "Summit SC",
      level_name: "Junior",
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
    if (!body.date_of_birth || !body.unit_name || !body.coach_user_id) {
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
  http.get("*/api/skaters", () => HttpResponse.json(mockSkaters)),
  http.get("*/api/dashboard", () => HttpResponse.json(mockDashboard)),
];
