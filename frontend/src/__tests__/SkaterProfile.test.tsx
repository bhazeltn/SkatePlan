import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { SkaterProfilePage } from "@/pages/SkaterProfilePage";
import { TOKEN_KEY } from "@/context/AuthContext";
import { server } from "@/mocks/server";
import { mockSkaterDetail } from "@/mocks/handlers";

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

describe("Health & Load — add restriction workflow", () => {
  async function openHealthTab() {
    seedSession();
    renderProfile();
    await screen.findByText(/Ava Nguyen/);
    await userEvent.click(
      screen.getByRole("tab", { name: /health & load/i })
    );
  }

  it("shows an add-restriction action on the Health & Load tab", async () => {
    await openHealthTab();
    expect(
      screen.getByRole("button", {
        name: /add restriction|log load modification/i,
      })
    ).toBeInTheDocument();
  });

  it("opens the modal with the expected restriction fields and types", async () => {
    await openHealthTab();
    await userEvent.click(
      screen.getByRole("button", {
        name: /add restriction|log load modification/i,
      })
    );
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByLabelText(/restriction type/i)).toBeInTheDocument();
    expect(dialog.getByLabelText(/excluded elements/i)).toBeInTheDocument();
    expect(
      dialog.getByLabelText(/return date|review date/i)
    ).toBeInTheDocument();
    expect(
      dialog.getByLabelText(/notes|coach instructions/i)
    ).toBeInTheDocument();
    expect(
      dialog.getByRole("option", { name: /jump impact limit/i })
    ).toBeInTheDocument();
    expect(
      dialog.getByRole("option", { name: /edge\/spin work only/i })
    ).toBeInTheDocument();
    expect(
      dialog.getByRole("option", { name: /total rest/i })
    ).toBeInTheDocument();
    expect(
      dialog.getByRole("option", { name: /custom note/i })
    ).toBeInTheDocument();
  });

  it("posts a new restriction and flips the load badge to Restricted", async () => {
    let restricted = false;
    server.use(
      http.get("*/api/skaters/:id", () =>
        HttpResponse.json(
          restricted
            ? { ...mockSkaterDetail, has_active_restriction: true }
            : { ...mockSkaterDetail, has_active_restriction: false, restrictions: [] }
        )
      ),
      http.post("*/api/skaters/:id/restrictions", async () => {
        restricted = true;
        return HttpResponse.json({ id: "r1", status: "active" }, { status: 201 });
      })
    );
    seedSession();
    renderProfile();
    await screen.findByText(/Ava Nguyen/);
    expect(screen.getByText(/standard load|all clear/i)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("tab", { name: /health & load/i })
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: /add restriction|log load modification/i,
      })
    );
    const dialog = within(screen.getByRole("dialog"));
    await userEvent.selectOptions(
      dialog.getByLabelText(/restriction type/i),
      "Jump Impact Limit"
    );
    await userEvent.type(
      dialog.getByLabelText(/excluded elements/i),
      "No 2A/Triples"
    );
    await userEvent.type(
      dialog.getByLabelText(/notes|coach instructions/i),
      "Ease back over two weeks"
    );
    await userEvent.click(
      dialog.getByRole("button", { name: /save|add restriction|submit/i })
    );
    await waitFor(() =>
      expect(screen.getByText(/restricted/i)).toBeInTheDocument()
    );
  });
});
