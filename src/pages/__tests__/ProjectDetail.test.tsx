import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectAgentBindingOut, ProjectOut, RegisteredAgentOut } from "../../api/client";
import ProjectDetail from "../ProjectDetail";

vi.mock("../../api/client", () => ({
  getProject: vi.fn(),
  listProjectAgents: vi.fn(),
  listRegisteredProjectAgents: vi.fn(),
}));

import { getProject, listProjectAgents, listRegisteredProjectAgents } from "../../api/client";

const INVOICE_PROJECT: ProjectOut = {
  project_id: "invoice-project",
  name: "Invoice Project",
  description: "Invoice processing system",
  status: "active",
  owner: "dushara",
  environment: "production",
  package_version: "1.0.0",
  endpoint: "",
  metadata: {},
  registration_status: "active",
  last_heartbeat_at: 1_700_000_000,
  agent_count: 1,
  budget: null,
  remaining: null,
  total_tokens: 0,
};

const BINDING: ProjectAgentBindingOut = {
  project_id: "invoice-project",
  project_name: "Invoice Project",
  agent_name: "invoice_agent",
  agent_description: "Processes customer invoices",
  provider_name: "anthropic",
  has_dedicated_provider: false,
  tools: ["search_invoice", "validate_invoice"],
  tool_context_keys: ["region"],
  http_endpoint: null,
  has_http_secret: false,
};

const REGISTERED_AGENT: RegisteredAgentOut = {
  project_id: "invoice-project",
  name: "invoice_agent",
  display_name: "Invoice Agent",
  description: "Processes customer invoices",
  capabilities: ["invoice", "billing"],
  version: "1.0.0",
  provider_name: "anthropic",
  model_name: null,
  tools: ["search_invoice", "validate_invoice"],
  metadata: {},
  status: "registered",
  effective_status: "not_installed",
  agent_code_loaded: false,
  created_at: 1_700_000_000,
  updated_at: 1_700_000_000,
  last_heartbeat_at: null,
};

function renderProjectDetail() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/projects/invoice-project"]}>
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProjectDetail", () => {
  beforeEach(() => {
    vi.mocked(getProject).mockReset();
    vi.mocked(listProjectAgents).mockReset();
    vi.mocked(listRegisteredProjectAgents).mockReset();
  });

  it("shows the project's registration status, environment, owner, and version", async () => {
    vi.mocked(getProject).mockResolvedValue(INVOICE_PROJECT);
    vi.mocked(listProjectAgents).mockResolvedValue([]);
    vi.mocked(listRegisteredProjectAgents).mockResolvedValue([]);

    renderProjectDetail();

    expect(await screen.findByText("Invoice Project")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("production")).toBeInTheDocument();
    expect(screen.getByText("dushara")).toBeInTheDocument();
    expect(screen.getByText("1.0.0")).toBeInTheDocument();
  });

  it("renders bound agents and registered agent metadata in separate sections", async () => {
    vi.mocked(getProject).mockResolvedValue(INVOICE_PROJECT);
    vi.mocked(listProjectAgents).mockResolvedValue([BINDING]);
    vi.mocked(listRegisteredProjectAgents).mockResolvedValue([REGISTERED_AGENT]);

    renderProjectDetail();

    expect((await screen.findAllByText("Processes customer invoices")).length).toBe(2);
    expect(await screen.findByText("Invoice Agent")).toBeInTheDocument();
    expect(screen.getByText(/registered but not installed/i)).toBeInTheDocument();
  });

  it("shows an empty state for registered agents when none have been registered", async () => {
    vi.mocked(getProject).mockResolvedValue(INVOICE_PROJECT);
    vi.mocked(listProjectAgents).mockResolvedValue([]);
    vi.mocked(listRegisteredProjectAgents).mockResolvedValue([]);

    renderProjectDetail();

    expect(await screen.findByText(/hasn't registered any agents/i)).toBeInTheDocument();
  });

  it("shows 'project not found' when the project query fails", async () => {
    vi.mocked(getProject).mockRejectedValue(new Error("404"));
    vi.mocked(listProjectAgents).mockResolvedValue([]);
    vi.mocked(listRegisteredProjectAgents).mockResolvedValue([]);

    renderProjectDetail();

    expect(await screen.findByText(/project not found/i)).toBeInTheDocument();
  });
});
