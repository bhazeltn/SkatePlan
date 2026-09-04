import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { AppShell } from "@/components/layout/AppShell";
import { renderWithProviders, mockViewport } from "@/test/utils";
import { TOKEN_KEY } from "@/context/AuthContext";

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

const LINKS = [
  "Dashboard",
  "Skaters",
  "Programs",
  "Sessions",
  "Competitions",
  "Gap Analysis",
];

describe("AppShell navigation", () => {
  it("renders a desktop sidebar with all primary links on wide viewports", () => {
    seedSession();
    mockViewport(false);
    renderWithProviders(
      <AppShell>
        <div>content</div>
      </AppShell>
    );
    const sidebar = screen.getByTestId("desktop-sidebar");
    for (const label of LINKS) {
      expect(within(sidebar).getByText(label)).toBeInTheDocument();
    }
  });

  it("renders a mobile bottom navigation below 768px", () => {
    seedSession();
    mockViewport(true);
    renderWithProviders(
      <AppShell>
        <div>content</div>
      </AppShell>
    );
    expect(screen.getByTestId("mobile-nav")).toBeInTheDocument();
    expect(screen.queryByTestId("desktop-sidebar")).not.toBeInTheDocument();
  });

  it("renders the user role badge and a logout action", () => {
    seedSession();
    mockViewport(false);
    renderWithProviders(
      <AppShell>
        <div>content</div>
      </AppShell>
    );
    expect(screen.getByText(/coach/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /log ?out/i })
    ).toBeInTheDocument();
  });
});
