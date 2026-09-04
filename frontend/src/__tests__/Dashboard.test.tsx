import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { DashboardPage } from "@/pages/DashboardPage";
import { server } from "@/mocks/server";
import { mockDashboard } from "@/mocks/handlers";
import { renderWithProviders } from "@/test/utils";
import { TOKEN_KEY } from "@/context/AuthContext";

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

describe("Coach dashboard — Action & Risk Hub", () => {
  it("surfaces attention items for missing plans and at-risk goals", async () => {
    seedSession();
    renderWithProviders(<DashboardPage />);
    const region = await screen.findByRole("region", {
      name: /attention (required|needed)|action required/i,
    });
    expect(within(region).getByText(/missing.*layout/i)).toBeInTheDocument();
    expect(
      within(region).getByText(/behind schedule|at risk/i)
    ).toBeInTheDocument();
  });

  it("lists active load restrictions as itemized cards, not a count", async () => {
    seedSession();
    renderWithProviders(<DashboardPage />);
    const region = await screen.findByRole("region", {
      name: /active load restrictions/i,
    });
    expect(within(region).getByText(/Ava/)).toBeInTheDocument();
    expect(
      within(region).getByText(/triple jump restriction/i)
    ).toBeInTheDocument();
    // Status badge renders the raw status text "active" (exact, case-sensitive)
    // — distinct from the "Active Load Restrictions" heading.
    expect(within(region).getByText("active")).toBeInTheDocument();
  });

  it("shows a neutral empty state when no restrictions exist", async () => {
    seedSession();
    server.use(
      http.get("*/api/dashboard", () =>
        HttpResponse.json({ ...mockDashboard, restrictions: [] })
      )
    );
    renderWithProviders(<DashboardPage />);
    const region = await screen.findByRole("region", {
      name: /active load restrictions/i,
    });
    expect(
      within(region).getByText(/all skaters cleared for standard load/i)
    ).toBeInTheDocument();
  });

  it("lists upcoming competitions sorted by date ascending", async () => {
    seedSession();
    renderWithProviders(<DashboardPage />);
    const region = await screen.findByRole("region", {
      name: /upcoming competitions/i,
    });
    const items = within(region).getAllByTestId("competition-item");
    expect(items).toHaveLength(2);
    // MSW returns Winter Open (Dec) before Autumn Classic (Oct); UI must sort.
    expect(items[0]).toHaveTextContent(/autumn classic/i);
    expect(items[1]).toHaveTextContent(/winter open/i);
  });

  it("shows a clean empty state when there are no upcoming competitions", async () => {
    seedSession();
    server.use(
      http.get("*/api/dashboard", () =>
        HttpResponse.json({ ...mockDashboard, upcoming_competitions: [] })
      )
    );
    renderWithProviders(<DashboardPage />);
    const region = await screen.findByRole("region", {
      name: /upcoming competitions/i,
    });
    expect(
      within(region).getByText(/no upcoming competitions/i)
    ).toBeInTheDocument();
  });

  it("renders skater cards for the roster", async () => {
    seedSession();
    renderWithProviders(<DashboardPage />);
    const cards = await screen.findAllByTestId("skater-card");
    expect(cards.length).toBeGreaterThanOrEqual(1);
    expect(within(cards[0]).getByText(/Ava/)).toBeInTheDocument();
  });

  it("does not render generic vanity counter cards", async () => {
    seedSession();
    renderWithProviders(<DashboardPage />);
    // Wait for the hub to render before asserting absence.
    await screen.findByRole("region", { name: /active load restrictions/i });
    expect(screen.queryByText(/weekly ice volume/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^active skaters$/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("stat-value")).not.toBeInTheDocument();
  });
});

describe("Skater onboarding from the dashboard", () => {
  it("opens the Add Skater dialog and auto-injects the coach_id", async () => {
    seedSession();
    const user = userEvent.setup();
    let captured: Record<string, unknown> | null = null;
    server.use(
      http.post("*/api/skaters/orchestrate", async ({ request }) => {
        captured = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { skater_id: 99, training_unit_id: 5, roster_entry_id: 7, assignment_id: 3 },
          { status: 201 }
        );
      })
    );

    renderWithProviders(<DashboardPage />);
    await user.click(await screen.findByRole("button", { name: /add skater/i }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/first name/i), "Mia");
    await user.type(within(dialog).getByLabelText(/last name/i), "Park");
    await user.type(within(dialog).getByLabelText(/date of birth/i), "2010-05-01");
    await user.type(within(dialog).getByLabelText(/home club|rink/i), "Senior Group");

    // The coach_id is derived from the session — never a manual input.
    expect(within(dialog).queryByLabelText(/coach id/i)).not.toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: /create skater|onboard/i })
    );

    await waitFor(() => expect(captured).not.toBeNull());
    const body = captured as unknown as Record<string, unknown>;
    expect(body.coach_user_id).toBe(10);
    expect(body.date_of_birth).toBe("2010-05-01");
    expect(body.home_club).toBe("Senior Group");
    expect(body.first_name).toBe("Mia");
  });

  it("exposes a parent/guardian field for a minor in the onboarding dialog", async () => {
    seedSession();
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);
    await user.click(await screen.findByRole("button", { name: /add skater/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/date of birth/i), "2012-06-01");
    expect(within(dialog).getByLabelText(/parent|guardian/i)).toBeInTheDocument();
  });
});
