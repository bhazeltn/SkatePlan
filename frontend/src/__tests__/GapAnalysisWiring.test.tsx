import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { SkaterProfilePage } from "@/pages/SkaterProfilePage";
import { GapAnalysisPage } from "@/pages/GapAnalysisPage";

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={["/skaters/1"]}>
      <AuthProvider>
        <Routes>
          <Route path="/skaters/:id" element={<SkaterProfilePage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

function renderGapPage() {
  return render(
    <MemoryRouter initialEntries={["/gap-analysis"]}>
      <AuthProvider>
        <GapAnalysisPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

const NEW_ASSESSMENT = /\+?\s*(New Benchmark Assessment|New Assessment|Conduct Benchmark Assessment)/i;

async function openGapTab() {
  seedSession();
  renderProfile();
  await screen.findByText(/Ava Nguyen/);
  await userEvent.click(screen.getByRole("tab", { name: /gap analysis/i }));
}

describe("Gap Analysis wiring — Skater Profile tab", () => {
  it("shows an empty state and a New Benchmark Assessment action when none on record", async () => {
    await openGapTab();
    expect(
      await screen.findByText(/No benchmark assessment on record/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: NEW_ASSESSMENT })).toBeInTheDocument();
  });

  it("reveals the interactive assessment form when the action is clicked", async () => {
    await openGapTab();
    await userEvent.click(await screen.findByRole("button", { name: NEW_ASSESSMENT }));
    expect(await screen.findByLabelText(/benchmark template/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/technical/i)).toBeInTheDocument();
  });

  it("renders the gap summary with met vs gap breakdown after submitting", async () => {
    await openGapTab();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: NEW_ASSESSMENT }));

    const templateSelect = await screen.findByLabelText(/benchmark template/i);
    await user.selectOptions(
      templateSelect,
      within(templateSelect).getByRole("option", {
        name: /Junior Level Benchmark Standard/i,
      })
    );
    await user.selectOptions(screen.getByLabelText(/technical/i), "Acquiring");
    await user.selectOptions(
      screen.getByLabelText(/skating skills/i),
      "Meeting Standard"
    );
    await user.selectOptions(screen.getByLabelText(/physical/i), "Not Introduced");
    await user.selectOptions(screen.getByLabelText(/performance/i), "Exceeding");
    await user.click(screen.getByRole("button", { name: /save assessment/i }));

    const summary = await screen.findByTestId("gap-summary");
    await waitFor(() => {
      expect(within(summary).getByTestId("gaps-count")).toHaveTextContent("2");
    });
    expect(within(summary).getByTestId("met-count")).toHaveTextContent("2");
  });

  it("never renders the phrase 'exit standard' on the Gap tab", async () => {
    await openGapTab();
    await userEvent.click(await screen.findByRole("button", { name: NEW_ASSESSMENT }));
    await screen.findByLabelText(/benchmark template/i);
    expect(screen.queryAllByText(/exit standard/i)).toHaveLength(0);
  });
});

describe("Gap Analysis wiring — Gap Analysis page", () => {
  it("opens the interactive form for the athlete whose card is clicked", async () => {
    seedSession();
    renderGapPage();
    await userEvent.click(await screen.findByRole("button", { name: /Ava Nguyen/i }));
    expect(await screen.findByLabelText(/benchmark template/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/technical/i)).toBeInTheDocument();
  });

  it("never renders the phrase 'exit standard' on the page", async () => {
    seedSession();
    renderGapPage();
    await userEvent.click(await screen.findByRole("button", { name: /Ava Nguyen/i }));
    await screen.findByLabelText(/benchmark template/i);
    expect(screen.queryAllByText(/exit standard/i)).toHaveLength(0);
  });
});
