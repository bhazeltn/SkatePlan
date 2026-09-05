import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { ProgramBuilder } from "@/components/programs/ProgramBuilder";
import { server } from "@/mocks/server";

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

function renderBuilder(props: Partial<React.ComponentProps<typeof ProgramBuilder>> = {}) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ProgramBuilder skaterId={2} onSaved={() => {}} {...props} />
      </AuthProvider>
    </MemoryRouter>
  );
}

async function addElement(user: ReturnType<typeof userEvent.setup>, code: string) {
  const input = await screen.findByRole("combobox", { name: /element/i });
  await user.type(input, code);
  const option = await screen.findByRole("option", { name: new RegExp(code, "i") });
  await user.click(option);
}

describe("Program sandbox builder", () => {
  it("offers a Short/Free segment selector", async () => {
    seedSession();
    renderBuilder();
    expect(
      await screen.findByRole("radio", { name: /short|SP/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /free|FS/i })).toBeInTheDocument();
  });

  it("adds an element and increases the planned base value total", async () => {
    seedSession();
    const user = userEvent.setup();
    renderBuilder();
    await addElement(user, "3Lz");
    const total = await screen.findByTestId("total-base-value");
    expect(total).toHaveTextContent("5.90");
    expect(total.className).toMatch(/tabular-nums/);
  });

  it("applies the second-half 1.1x bonus to a jump's base value", async () => {
    seedSession();
    const user = userEvent.setup();
    renderBuilder();
    await addElement(user, "3Lz");
    const bonus = await screen.findByRole("checkbox", { name: /second half/i });
    await user.click(bonus);
    await waitFor(() =>
      expect(screen.getByTestId("total-base-value")).toHaveTextContent("6.49")
    );
  });

  it("offers only clean base elements, excluding execution-flag variants", async () => {
    seedSession();
    const user = userEvent.setup();
    renderBuilder();
    const input = await screen.findByRole("combobox", { name: /element/i });
    await user.type(input, "2A");
    // The clean base element is offered.
    expect(
      await screen.findByText("2A", { selector: "span" })
    ).toBeInTheDocument();
    // The quarter-rotation execution-flag variant must NOT be offered.
    expect(screen.queryByText("2Aq")).not.toBeInTheDocument();
    // Nor should the under-rotation variant surface for a different query.
    await user.clear(input);
    await user.type(input, "3T");
    expect(
      await screen.findByText("3T", { selector: "span" })
    ).toBeInTheDocument();
    expect(screen.queryByText("3T<")).not.toBeInTheDocument();
  });

  it("allows entering combination elements via Enter key and calculates combined base value", async () => {
    seedSession();
    const user = userEvent.setup();
    renderBuilder();
    const input = await screen.findByRole("combobox", { name: /element/i });

    // Type a combination and press Enter
    await user.type(input, "3Lz+3T{Enter}");

    const slot = await screen.findByTestId("element-slot");
    expect(slot).toHaveTextContent("3Lz+3T");

    // 3Lz (5.90) + 3T (4.20) = 10.10
    const total = screen.getByTestId("total-base-value");
    expect(total).toHaveTextContent("10.10");
  });

  it("only offers the second-half bonus for jump elements", async () => {
    seedSession();
    const user = userEvent.setup();
    renderBuilder();

    // Add a spin
    await addElement(user, "CCoSp4");
    // Add a step sequence
    await addElement(user, "StSq3");
    // Add a jump
    await addElement(user, "3Lz");

    // There should only be 1 second-half bonus checkbox (for the jump)
    const bonusCheckboxes = screen.queryAllByRole("checkbox", { name: /second half/i });
    expect(bonusCheckboxes).toHaveLength(1);
  });


  it("saves a valid payload with ordered elements and per-element flags", async () => {
    seedSession();
    const user = userEvent.setup();
    let captured: Record<string, unknown> | null = null;
    server.use(
      http.post("*/api/programs", async ({ request }) => {
        captured = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: "new-prog" }, { status: 201 });
      })
    );
    renderBuilder();
    await addElement(user, "3Lz");
    await user.click(await screen.findByRole("checkbox", { name: /second half/i }));
    await user.click(screen.getByRole("button", { name: /save program/i }));

    await waitFor(() => expect(captured).not.toBeNull());
    const body = captured as unknown as Record<string, unknown>;
    expect(body.program_type).toBe("SP");
    const elements = body.program_elements as Array<Record<string, unknown>>;
    expect(elements[0].element_code).toBe("3Lz");
    expect(elements[0].segment_order).toBe(1);
    expect(elements[0].is_second_half_bonus).toBe(true);
  });
});
