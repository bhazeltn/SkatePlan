import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { GapAnalysisPage } from "@/pages/GapAnalysisPage";

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/gap-analysis"]}>
      <AuthProvider>
        <GapAnalysisPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Competitive Development & Benchmark Assessment", () => {
  it("renders the coaching assessment heading", async () => {
    seedSession();
    renderPage();
    expect(
      await screen.findByRole("heading", {
        name: /Competitive Development & Benchmark Assessment/i,
      })
    ).toBeInTheDocument();
  });

  it("lets the coach select a benchmark template and score four pillars", async () => {
    seedSession();
    renderPage();
    const user = userEvent.setup();

    // Skater selector populated from GET /api/skaters.
    const skaterSelect = await screen.findByLabelText(/skater/i);
    await user.selectOptions(skaterSelect, "1");

    // Benchmark template from GET /api/standards/templates (federation-neutral).
    const templateSelect = await screen.findByLabelText(/benchmark template/i);
    await user.selectOptions(
      templateSelect,
      "Junior Level Exit Standard - International Track"
    );

    // Four editable pillars must be present.
    expect(screen.getByLabelText(/technical/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/skating skills/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/physical/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/performance/i)).toBeInTheDocument();
  });

  it("submits scores and updates the gap status summary", async () => {
    seedSession();
    renderPage();
    const user = userEvent.setup();

    await user.selectOptions(await screen.findByLabelText(/skater/i), "1");
    await user.selectOptions(
      await screen.findByLabelText(/benchmark template/i),
      "Junior Level Exit Standard - International Track"
    );

    await user.selectOptions(screen.getByLabelText(/technical/i), "Acquiring");
    await user.selectOptions(
      screen.getByLabelText(/skating skills/i),
      "Meeting Standard"
    );
    await user.selectOptions(
      screen.getByLabelText(/physical/i),
      "Not Introduced"
    );
    await user.selectOptions(
      screen.getByLabelText(/performance/i),
      "Exceeding"
    );

    await user.click(screen.getByRole("button", { name: /save assessment/i }));

    const summary = await screen.findByTestId("gap-summary");
    await waitFor(() => {
      expect(within(summary).getByText(/Gaps Identified/i)).toBeInTheDocument();
    });
    expect(within(summary).getByText(/Benchmarks Met/i)).toBeInTheDocument();
    // Two pillars below Meeting Standard => 2 gaps, 2 met.
    expect(within(summary).getByTestId("gaps-count")).toHaveTextContent("2");
    expect(within(summary).getByTestId("met-count")).toHaveTextContent("2");
  });
});
