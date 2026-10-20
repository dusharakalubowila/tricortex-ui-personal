import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ComplianceReportOut,
  HealthOut,
  OrchestratorAgentOut,
  ProjectOut,
  RegisteredAgentOut,
  TaskRecordOut,
  TenantSummaryOut,
} from "../../api/client";
import Overview from "../Overview";

vi.mock("../../api/client", () => ({
  getGovernanceReportJson: vi.fn(),
  getHealth: vi.fn(),
  getOrchestratorAgents: vi.fn(),
  listProjects: vi.fn(),
  listRegisteredProjectAgents: vi.fn(),
  listTasks: vi.fn(),
  listTenants: vi.fn(),
}));

import {
  getGovernanceReportJson,
  getHealth,
  getOrchestratorAgents,
  listProjects,
  listRegisteredProjectAgents,
  listTasks,
  listTenants,
} from "../../api/client";

const HEALTHY: HealthOut = { status: "ok", worker_alive: true, queue_backend: "memory", queued: 0, running: 0 };

const EMPTY_REPORT: ComplianceReportOut = {
  generated_at: 0,
  policy_count: 0,
  default_deny: false,
  policies_by_rule: {},
  event_counts: {},
  pending_approvals: 0,
  resolved_approvals: 0,
  total_tokens: 0,
  input_guardrail_names: [],
  output_guardrail_names: [],
  findings: [],
};

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
  last_heartbeat_at: null,
  agent_count: 1,
  budget: 500_000,
  remaining: 490_000,
  total_tokens: 10_000,
};

const CHAT_AGENT: OrchestratorAgentOut = {
  name: "chat_agent",
  description: "General-purpose chat agent",
  project: null,
  projects: ["vizai"],
  capabilities: [],
  tools: [],
  provider_name: null,
  has_dedicated_provider: false,
};

function renderOverview() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Overview", () => {
  beforeEach(() => {
    vi.mocked(getGovernanceReportJson).mockReset().mockResolvedValue(EMPTY_REPORT);
    vi.mocked(getHealth).mockReset().mockResolvedValue(HEALTHY);
    vi.mocked(getOrchestratorAgents).mockReset().mockResolvedValue([]);
    vi.mocked(listProjects).mockReset().mockResolvedValue([]);
    vi.mocked(listRegisteredProjectAgents).mockReset().mockResolvedValue([]);
    vi.mocked(listTasks).mockReset().mockResolvedValue([]);
    vi.mocked(listTenants).mockReset().mockResolvedValue([]);
  });

  it("shows a healthy kernel banner when the worker is alive and there are no findings", async () => {
    renderOverview();
    expect(await screen.findByText("Kernel Healthy")).toBeInTheDocument();
    expect(screen.queryByText(/wide open/i)).not.toBeInTheDocument();
  });

  it("shows a degraded state when the worker is not alive", async () => {
    vi.mocked(getHealth).mockResolvedValue({ ...HEALTHY, worker_alive: false });
    renderOverview();
    expect(await screen.findByText("Kernel Degraded")).toBeInTheDocument();
  });

  it("renders real project/agent/token counts, not placeholder numbers", async () => {
    vi.mocked(listProjects).mockResolvedValue([VIZAI]);
    vi.mocked(getOrchestratorAgents).mockResolvedValue([CHAT_AGENT]);
    vi.mocked(listTenants).mockResolvedValue([{ tenant_id: "vizai", budget: 500_000, remaining: 490_000, total_tokens: 10_000 } as TenantSummaryOut]);

    renderOverview();

    // "VizAI" appears both in the Connected Projects list and the Architecture Flow
    // diagram -- both are real, intentional, so assert there are at least that many.
    expect((await screen.findAllByText("VizAI")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0); // Connected Projects / Active Agents
    expect(screen.getAllByText("10,000").length).toBeGreaterThan(0); // Total Token Usage
  });

  it("shows the governance findings banner in plain language when gaps exist", async () => {
    vi.mocked(getGovernanceReportJson).mockResolvedValue({
      ...EMPTY_REPORT,
      findings: [{ severity: "risk", message: "raw message", code: "allow_by_default" }],
    });

    renderOverview();

    expect(await screen.findByText(/wide open/i)).toBeInTheDocument();
    expect(screen.getByText(/no approval is required for any agent action/i)).toBeInTheDocument();
  });

  it("shows real installed/registered agent counts from the registration API, not orchestrator agent counts", async () => {
    vi.mocked(listProjects).mockResolvedValue([VIZAI]);
    const registered: RegisteredAgentOut = {
      project_id: "vizai",
      name: "invoice_agent",
      display_name: "Invoice Agent",
      description: "",
      capabilities: [],
      version: "",
      provider_name: null,
      model_name: null,
      tools: [],
      metadata: {},
      status: "registered",
      effective_status: "installed",
      agent_code_loaded: true,
      created_at: 0,
      updated_at: 0,
      last_heartbeat_at: null,
    };
    vi.mocked(listRegisteredProjectAgents).mockResolvedValue([registered]);

    renderOverview();

    expect(await screen.findByText("1 / 1")).toBeInTheDocument();
    expect(screen.getByText("Executable")).toBeInTheDocument();
  });

  it("shows recent tasks with real project/agent columns", async () => {
    const task: TaskRecordOut = {
      task_id: "t1",
      status: "completed",
      goal: "Summarize the report",
      agent_name: "chat_agent",
      tenant_id: "vizai",
      result: "done",
      error: null,
      retry_count: 0,
      created_at: 0,
      updated_at: 0,
      control_signal: null,
      approval_id: null,
    };
    vi.mocked(listTasks).mockResolvedValue([task]);

    renderOverview();

    expect(await screen.findByText("Summarize the report")).toBeInTheDocument();
    expect(screen.getByText("vizai")).toBeInTheDocument();
    expect(screen.getByText("chat_agent")).toBeInTheDocument();
  });

  it("shows an empty state for recent tasks when none exist", async () => {
    renderOverview();
    expect(await screen.findByText(/no tasks submitted yet/i)).toBeInTheDocument();
  });
});
