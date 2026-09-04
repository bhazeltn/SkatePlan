import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import App from "@/App";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/utils";
import { TOKEN_KEY } from "@/context/AuthContext";

describe("Login", () => {
  it("renders email and password fields", () => {
    renderWithProviders(<App />, { route: "/login" });
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("persists the JWT and redirects to the dashboard on success", async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/login" });
    await user.type(screen.getByLabelText(/email/i), "coach@ex.com");
    await user.type(screen.getByLabelText(/password/i), "Secret123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(localStorage.getItem(TOKEN_KEY)).toBeTruthy()
    );
    expect(
      await screen.findByRole("heading", { name: /dashboard/i })
    ).toBeInTheDocument();
  });

  it("shows a rose error alert on failed login", async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/login" });
    await user.type(screen.getByLabelText(/email/i), "coach@ex.com");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/invalid/i);
    expect(alert.className).toMatch(/rose/);
  });
});

describe("Skater registration", () => {
  it("validates required fields before submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/register" });
    await user.click(screen.getByRole("button", { name: /create skater/i }));
    expect((await screen.findAllByText(/required/i)).length).toBeGreaterThan(0);
  });

  it("sends a SafeSport-compliant orchestrate payload", async () => {
    const user = userEvent.setup();
    let captured: Record<string, unknown> | null = null;
    server.use(
      http.post("*/api/skaters/orchestrate", async ({ request }) => {
        captured = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            skater_id: 99,
            training_unit_id: 5,
            roster_entry_id: 7,
            assignment_id: 3,
          },
          { status: 201 }
        );
      })
    );

    renderWithProviders(<App />, { route: "/register" });
    await user.type(screen.getByLabelText(/first name/i), "Mia");
    await user.type(screen.getByLabelText(/last name/i), "Park");
    await user.type(screen.getByLabelText(/email/i), "mia@ex.com");
    await user.type(screen.getByLabelText(/password/i), "Secret123!");
    await user.type(screen.getByLabelText(/date of birth/i), "2010-05-01");
    await user.type(screen.getByLabelText(/training unit/i), "Senior Group");
    await user.type(screen.getByLabelText(/coach id/i), "10");
    await user.click(screen.getByRole("button", { name: /create skater/i }));

    await waitFor(() => expect(captured).not.toBeNull());
    const body = captured as unknown as Record<string, unknown>;
    expect(body.date_of_birth).toBe("2010-05-01");
    expect(body.unit_name).toBe("Senior Group");
    expect(body.coach_user_id).toBe(10);
    expect(body.email).toBe("mia@ex.com");
    expect(body.first_name).toBe("Mia");
  });
});
