import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { GapAnalysisTab } from "@/components/skaters/GapAnalysisTab";
import { server } from "@/mocks/server";

interface Bench {
  id: string;
  category: string;
  name: string;
  status: string;
  notes?: string;
  target_date?: string | null;
}

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

/** Install a stateful in-memory benchmarks CRUD API for the test. */
function installBenchmarkApi(initial: Bench[] = []) {
  let store: Bench[] = [...initial];
  let seq = store.length;
  server.use(
    http.get("*/api/skaters/:id/benchmarks", () => HttpResponse.json(store)),
    http.post("*/api/skaters/:id/benchmarks", async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      const rec = { id: `b${++seq}`, ...body } as Bench;
      store.push(rec);
      return HttpResponse.json(rec, { status: 201 });
    }),
    http.patch("*/api/skaters/:id/benchmarks/:bid", async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      store = store.map((i) => (i.id === params.bid ? { ...i, ...body } : i));
      return HttpResponse.json(store.find((i) => i.id === params.bid));
    }),
    http.delete("*/api/skaters/:id/benchmarks/:bid", ({ params }) => {
      store = store.filter((i) => i.id !== params.bid);
      return new HttpResponse(null, { status: 204 });
    })
  );
}

function renderTab() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <GapAnalysisTab skaterId={1} />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Coach-driven custom benchmarks", () => {
  it("shows a + Add Benchmark action and does not force a template dropdown", async () => {
    seedSession();
    installBenchmarkApi([]);
    renderTab();
    expect(
      await screen.findByRole("button", { name: /add benchmark/i })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/benchmark template/i)).not.toBeInTheDocument();
  });

  it("opens an inline form with Category, Target Name, Status and Notes", async () => {
    seedSession();
    installBenchmarkApi([]);
    renderTab();
    await userEvent.click(
      await screen.findByRole("button", { name: /add benchmark/i })
    );
    expect(await screen.findByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    ["Not Introduced", "Developing", "Solidifying", "Met"].forEach((label) => {
      expect(
        screen.getByRole("option", { name: new RegExp(`^${label}$`, "i") })
      ).toBeInTheDocument();
    });
  });

  it("adds a saved benchmark to the matrix grouped under its category", async () => {
    seedSession();
    installBenchmarkApi([]);
    const user = userEvent.setup();
    renderTab();
    await user.click(await screen.findByRole("button", { name: /add benchmark/i }));
    await user.selectOptions(await screen.findByLabelText(/category/i), "Jumps");
    await user.type(screen.getByLabelText(/target name/i), "Triple Axel");
    await user.selectOptions(screen.getByLabelText(/current status/i), "Developing");
    await user.click(screen.getByRole("button", { name: /save benchmark/i }));

    expect(await screen.findByText(/Triple Axel/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /jumps/i })).toBeInTheDocument();
  });

  it("renders status toggles and a delete action on each benchmark row", async () => {
    seedSession();
    installBenchmarkApi([
      { id: "b1", category: "Jumps", name: "Triple Axel", status: "DEVELOPING" },
    ]);
    renderTab();
    await screen.findByText(/Triple Axel/);
    ["Not Introduced", "Developing", "Solidifying", "Met"].forEach((label) => {
      expect(
        screen.getByRole("button", { name: new RegExp(`^${label}$`, "i") })
      ).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole("button", { name: /delete|remove/i }));
    await waitFor(() =>
      expect(screen.queryByText(/Triple Axel/)).not.toBeInTheDocument()
    );
  });

  it("updates a benchmark status via one-click chip", async () => {
    seedSession();
    installBenchmarkApi([
      { id: "b1", category: "Jumps", name: "Triple Axel", status: "DEVELOPING" },
    ]);
    renderTab();
    await screen.findByText(/Triple Axel/);
    const summary = screen.getByTestId("benchmark-summary");
    expect(within(summary).getByTestId("bench-met")).toHaveTextContent("0");
    await userEvent.click(screen.getByRole("button", { name: /^Met$/i }));
    await waitFor(() =>
      expect(within(summary).getByTestId("bench-met")).toHaveTextContent("1")
    );
  });

  it("shows a gap delta summary of Total, Met, Developing and Gaps", async () => {
    seedSession();
    installBenchmarkApi([
      { id: "b1", category: "Jumps", name: "3A", status: "MET" },
      { id: "b2", category: "Jumps", name: "3Lz", status: "DEVELOPING" },
      { id: "b3", category: "Spins", name: "CCoSp4", status: "NOT_STARTED" },
    ]);
    renderTab();
    const summary = await screen.findByTestId("benchmark-summary");
    expect(within(summary).getByTestId("bench-total")).toHaveTextContent("3");
    expect(within(summary).getByTestId("bench-met")).toHaveTextContent("1");
    expect(within(summary).getByTestId("bench-developing")).toHaveTextContent("1");
    expect(within(summary).getByTestId("bench-gaps")).toHaveTextContent("1");
  });
});
