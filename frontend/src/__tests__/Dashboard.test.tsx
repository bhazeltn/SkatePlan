import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { DashboardPage } from "@/pages/DashboardPage";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/utils";
import { TOKEN_KEY } from "@/context/AuthContext";

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

const STAT_LABELS = [
  "Active Skaters",
  "Weekly Ice Volume",
  "Upcoming Competitions",
  "Active Load Restrictions",
];

describe("Coach dashboard", () => {
  it("renders macro stat cards with tabular-nums numbers", async () => {
    seedSession();
    renderWithProviders(<DashboardPage />);
    for (const label of STAT_LABELS) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
    const numbers = screen.getAllByTestId("stat-value");
    expect(numbers.length).toBeGreaterThanOrEqual(4);
    for (const n of numbers) {
      expect(n.className).toMatch(/tabular-nums|font-mono/);
    }
  });

  it("shows an active injury alert banner when restrictions exist", async () => {
    seedSession();
    renderWithProviders(<DashboardPage />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/restriction/i);
    expect(alert.className).toMatch(/rose/);
  });

  it("renders skater cards for the roster", async () => {
    seedSession();
    renderWithProviders(<DashboardPage />);
    const cards = await screen.findAllByTestId("skater-card");
    expect(cards.length).toBeGreaterThanOrEqual(1);
    expect(within(cards[0]).getByText(/Ava/)).toBeInTheDocument();
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
    await user.type(within(dialog).getByLabelText(/training unit/i), "Senior Group");

    // The coach_id is derived from the session — never a manual input.
    expect(within(dialog).queryByLabelText(/coach id/i)).not.toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: /create skater|onboard/i })
    );

    await waitFor(() => expect(captured).not.toBeNull());
    const body = captured as unknown as Record<string, unknown>;
    expect(body.coach_user_id).toBe(10);
    expect(body.date_of_birth).toBe("2010-05-01");
    expect(body.unit_name).toBe("Senior Group");
    expect(body.first_name).toBe("Mia");
  });

  it("exposes a parent/guardian field in the onboarding dialog", async () => {
    seedSession();
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);
    await user.click(await screen.findByRole("button", { name: /add skater/i }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/parent|guardian/i)).toBeInTheDocument();
  });
});
