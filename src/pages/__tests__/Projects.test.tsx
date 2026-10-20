import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectOut } from "../../api/client";
import Projects from "../Projects";

vi.mock("../../api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    body: string;
    constructor(status: number, body: string) {
      super(`API request failed with status ${status}: ${body}`);
      this.status = status;
      this.body = body;
    }
  },
  listProjects: vi.fn(),
  createProject: vi.fn(),
}));

import { createProject, listProjects } from "../../api/client";

const VIZAI: ProjectOut = {
  project_id: "vizai",
  name: "VizAI",
  description: "Computer-vision device monitoring product.",
  status: "active",
  owner: "",
  environment: "",
  package_version: "",
  endpoint: "",
  metadata: {},
  registration_status: "active",
  last_heartbeat_at: 1_700_000_000,
  agent_count: 1,
  budget: 500_000,
  remaining: 490_000,
  total_tokens: 10_000,
};

const INVOICE_PROJECT: ProjectOut = {
  project_id: "invoice-project",
  name: "Invoice Project",
  description: "Invoice processing system",
  status: "active",
  owner: "dushara",
  environment: "development",
  package_version: "1.0.0",
  endpoint: "",
  metadata: {},
  registration_status: "registered",
  last_heartbeat_at: null,
  agent_count: 0,
  budget: null,
  remaining: null,
  total_tokens: 0,
};

function renderProjects() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Projects />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Projects", () => {
  beforeEach(() => {
    vi.mocked(listProjects).mockReset();
    vi.mocked(createProject).mockReset();
  });

  it("renders registered projects with their registration status badge", async () => {
    vi.mocked(listProjects).mockResolvedValue([VIZAI]);

    renderProjects();

    expect(await screen.findByText("VizAI")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("shows an externally self-registered project (no heartbeat yet) as 'registered', not 'active'", async () => {
    vi.mocked(listProjects).mockResolvedValue([INVOICE_PROJECT]);

    renderProjects();

    expect(await screen.findByText("Invoice Project")).toBeInTheDocument();
    expect(screen.getByText("registered")).toBeInTheDocument();
    expect(screen.getByText(/development/)).toBeInTheDocument();
    expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
  });

  it("shows an empty state when no projects are registered", async () => {
    vi.mocked(listProjects).mockResolvedValue([]);

    renderProjects();

    expect(await screen.findByText(/no projects registered yet/i)).toBeInTheDocument();
  });

  it("a newly registered project appears once the list query refetches -- no frontend code change needed", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(listProjects).mockResolvedValueOnce([VIZAI]);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Projects />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText("VizAI")).toBeInTheDocument();
    expect(screen.queryByText("Invoice Project")).not.toBeInTheDocument();

    // Simulates what the real app's refetchInterval does on its own: the exact same
    // `["projects"]` query re-runs and picks up a project registered in the meantime,
    // with zero component/frontend code involved beyond the polling already configured
    // on this page.
    vi.mocked(listProjects).mockResolvedValueOnce([VIZAI, INVOICE_PROJECT]);
    await queryClient.invalidateQueries({ queryKey: ["projects"] });

    expect(await screen.findByText("Invoice Project")).toBeInTheDocument();
  });

  it("registers a new project via the form and surfaces a validation error when fields are missing", async () => {
    const user = userEvent.setup();
    vi.mocked(listProjects).mockResolvedValue([]);

    renderProjects();
    await screen.findByText(/no projects registered yet/i);

    await user.click(screen.getByRole("button", { name: /register project/i }));
    expect(await screen.findByText(/project id and name are required/i)).toBeInTheDocument();
    expect(createProject).not.toHaveBeenCalled();
  });
});
