import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { DashboardPage } from "@/pages/DashboardPage";
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
