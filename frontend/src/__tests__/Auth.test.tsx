import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import App from "@/App";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/utils";
import { TOKEN_KEY } from "@/context/AuthContext";

const REGISTER_BTN = /create account|create coach account|register|sign up/i;

describe("Login", () => {
  it("renders email and password fields", () => {
    renderWithProviders(<App />, { route: "/login" });
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("links to coach account creation", () => {
    renderWithProviders(<App />, { route: "/login" });
    const link = screen.getByRole("link", {
      name: /new coach\? create an account/i,
    });
    expect(link).toHaveAttribute("href", "/register");
  });

  it("persists the JWT and redirects to the dashboard on success", async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/login" });
    await user.type(screen.getByLabelText(/email/i), "coach@ex.com");
    await user.type(screen.getByLabelText(/password/i), "Secret123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(localStorage.getItem(TOKEN_KEY)).toBeTruthy());
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

describe("Coach registration", () => {
  it("renders the coach account form (no skater-only fields)", () => {
    renderWithProviders(<App />, { route: "/register" });
    expect(
      screen.getByRole("heading", {
        name: /create coach account|coach registration/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/club/i)).toBeInTheDocument(); // optional
    // Skater-only fields must NOT appear on coach registration.
    expect(screen.queryByLabelText(/date of birth/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/coach id/i)).not.toBeInTheDocument();
  });

  it("registers a coach then redirects to the dashboard", async () => {
    const user = userEvent.setup();
    let registered: Record<string, unknown> | null = null;
    server.use(
      http.post("*/api/auth/register", async ({ request }) => {
        registered = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { access_token: "x", token_type: "bearer", user_id: 10, role: "coach" },
          { status: 201 }
        );
      })
    );

    renderWithProviders(<App />, { route: "/register" });
    await user.type(screen.getByLabelText(/first name/i), "Casey");
    await user.type(screen.getByLabelText(/last name/i), "Rink");
    await user.type(screen.getByLabelText(/email/i), "casey@ex.com");
    await user.type(screen.getByLabelText(/password/i), "Secret123!");
    await user.click(screen.getByRole("button", { name: REGISTER_BTN }));

    await waitFor(() => expect(registered).not.toBeNull());
    const body = registered as unknown as Record<string, unknown>;
    expect(body.email).toBe("casey@ex.com");
    expect(body.first_name).toBe("Casey");
    expect(body.last_name).toBe("Rink");
    expect(
      await screen.findByRole("heading", { name: /dashboard/i })
    ).toBeInTheDocument();
  });

  it("shows a semantic alert when registration fails", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/auth/register", () =>
        HttpResponse.json({ detail: "Email already registered" }, { status: 400 })
      )
    );

    renderWithProviders(<App />, { route: "/register" });
    await user.type(screen.getByLabelText(/first name/i), "Casey");
    await user.type(screen.getByLabelText(/last name/i), "Rink");
    await user.type(screen.getByLabelText(/email/i), "dupe@ex.com");
    await user.type(screen.getByLabelText(/password/i), "Secret123!");
    await user.click(screen.getByRole("button", { name: REGISTER_BTN }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
