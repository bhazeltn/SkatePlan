import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AddSkaterModal } from "@/components/skaters/AddSkaterModal";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/utils";
import { TOKEN_KEY } from "@/context/AuthContext";

const LEVELS = [
  "StarSkate",
  "Juvenile",
  "Pre-Novice",
  "Novice",
  "Junior",
  "Senior",
  "Adult",
];

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

function open() {
  seedSession();
  renderWithProviders(
    <AddSkaterModal open onClose={() => {}} onCreated={() => {}} />
  );
  return within(screen.getByRole("dialog"));
}

describe("Add Skater modal — figure-skating onboarding fields", () => {
  it("replaces Training unit with a Home Club / Rink field", () => {
    const dialog = open();
    expect(dialog.getByLabelText(/home club|rink/i)).toBeInTheDocument();
    expect(dialog.queryByLabelText(/training unit/i)).not.toBeInTheDocument();
  });

  it("offers a Competitive Level select with the standard levels", () => {
    const dialog = open();
    const select = dialog.getByLabelText(/competitive level/i);
    for (const level of LEVELS) {
      expect(within(select).getByRole("option", { name: level })).toBeInTheDocument();
    }
  });

  it("lists federations sorted alphabetically by country", async () => {
    const user = userEvent.setup();
    const dialog = open();
    await user.click(dialog.getByLabelText(/federation/i));
    const listbox = await dialog.findByRole("listbox", { name: /federation/i });
    const options = within(listbox).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Australia — Australian Ice Skating Association",
      "Canada — Skate Canada",
      "Philippines — Philippine Skating Union",
      "United States — U.S. Figure Skating",
    ]);
  });

  it("filters federations by country substring", async () => {
    const user = userEvent.setup();
    const dialog = open();
    await user.type(dialog.getByLabelText(/federation/i), "Phil");
    const listbox = await dialog.findByRole("listbox", { name: /federation/i });
    const options = within(listbox).getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Philippines — Philippine Skating Union");
  });

  it("filters federations by federation-name substring", async () => {
    const user = userEvent.setup();
    const dialog = open();
    await user.type(dialog.getByLabelText(/federation/i), "Skate Canada");
    const listbox = await dialog.findByRole("listbox", { name: /federation/i });
    const options = within(listbox).getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Canada — Skate Canada");
  });

  it("requires parent/guardian email and keeps skater email optional for minors", async () => {
    const user = userEvent.setup();
    const dialog = open();
    await user.type(dialog.getByLabelText(/date of birth/i), "2012-06-01");
    expect(dialog.getByLabelText(/parent|guardian/i)).toBeRequired();
    expect(dialog.getByLabelText(/skater email/i)).not.toBeRequired();
  });

  it("requires skater email and hides parent/guardian for adults", async () => {
    const user = userEvent.setup();
    const dialog = open();
    await user.type(dialog.getByLabelText(/date of birth/i), "2000-01-01");
    expect(dialog.getByLabelText(/skater email/i)).toBeRequired();
    expect(dialog.queryByLabelText(/parent|guardian/i)).not.toBeInTheDocument();
  });

  it("submits federation_id, competitive_level, home_club and coach_user_id", async () => {
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
    const dialog = open();
    await user.type(dialog.getByLabelText(/first name/i), "Mia");
    await user.type(dialog.getByLabelText(/last name/i), "Park");
    await user.type(dialog.getByLabelText(/date of birth/i), "2000-01-01");
    await user.type(dialog.getByLabelText(/home club|rink/i), "Ice Palace");
    await user.type(dialog.getByLabelText(/skater email/i), "mia@example.com");
    await user.selectOptions(dialog.getByLabelText(/competitive level/i), "Senior");

    await user.type(dialog.getByLabelText(/federation/i), "Skate Canada");
    const listbox = await dialog.findByRole("listbox", { name: /federation/i });
    await user.click(within(listbox).getByRole("option"));

    await user.click(dialog.getByRole("button", { name: /create skater|onboard/i }));

    await waitFor(() => expect(captured).not.toBeNull());
    const body = captured as unknown as Record<string, unknown>;
    expect(body.federation_id).toBe(2);
    expect(body.competitive_level).toBe("Senior");
    expect(body.home_club).toBe("Ice Palace");
    expect(body.coach_user_id).toBe(10);
    expect(body.contact_email).toBe("mia@example.com");
  });
});
