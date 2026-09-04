import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { SkaterProfilePage } from "@/pages/SkaterProfilePage";
import { TOKEN_KEY } from "@/context/AuthContext";

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

describe("Skater profile hub", () => {
  it("renders the identity header with flag, federation, level and club", async () => {
    seedSession();
    renderProfile();
    expect(await screen.findByText(/Ava Nguyen/)).toBeInTheDocument();
    expect(screen.getByText(/Philippine Skating Union/)).toBeInTheDocument();
    expect(screen.getByText(/🇵🇭/)).toBeInTheDocument();
    expect(screen.getByText(/Senior/)).toBeInTheDocument();
    expect(screen.getByText(/Glacier FSC/)).toBeInTheDocument();
  });

  it("shows a load-status badge for a restricted skater", async () => {
    seedSession();
    renderProfile();
    await screen.findByText(/Ava Nguyen/);
    expect(screen.getByText(/restricted/i)).toBeInTheDocument();
  });

  it("renders the four profile tabs", async () => {
    seedSession();
    renderProfile();
    await screen.findByText(/Ava Nguyen/);
    expect(screen.getByRole("tab", { name: /programs/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /health & load/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /goals & standards/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /competitions/i })
    ).toBeInTheDocument();
  });

  it("lists existing programs and a build-new-program action on the Programs tab", async () => {
    seedSession();
    renderProfile();
    await screen.findByText(/Ava Nguyen/);
    expect(screen.getByText(/Free Skate 2026/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /build new program/i })
    ).toBeInTheDocument();
  });
});
