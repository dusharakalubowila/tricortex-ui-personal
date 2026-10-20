/**
 * Typed API client for the Agentic Kernel console.
 *
 * This module is the single point of coupling between the frontend and the STEP-01
 * FastAPI service (`ai-agentic-kernel/api`). Every interface below mirrors a Pydantic
 * model in `agentic_kernel_api/schemas.py` field-for-field. All HTTP calls are funneled
 * through `request()`/`API_BASE_URL` so the base URL and error handling stay in one place.
 */

// PUBLIC_INTERFACE
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

// PUBLIC_INTERFACE
/** Sent as `X-API-Key` on every request when set (see `request()` below) -- matches the
 * backend's optional `AGENTIC_KERNEL_API_KEY` check (`api/agentic_kernel_api/auth.py`).
 * Unset (the local/demo default): no header is sent, same as before this existed.
 *
 * SECURITY NOTE: this is baked into the built JS bundle at build time, same as
 * `VITE_API_BASE_URL` -- and unlike that value, this one is a credential. Vite's build
 * output is static files served to whatever can reach your UI's origin (e.g. anyone who
 * can load the deployed Amplify URL), so anyone who can view the deployed page can
 * view-source this key out of the bundle. Only set `VITE_API_KEY` if the UI itself is not
 * fully public (e.g. restricted at the network level, or access is otherwise gated) --
 * baking it in does not, by itself, turn the single shared `AGENTIC_KERNEL_API_KEY` into a
 * real per-user credential boundary. */
export const API_KEY: string | undefined = import.meta.env.VITE_API_KEY as string | undefined;

/** Mirrors `TaskRequestIn` in `schemas.py`. */
export interface TaskRequestIn {
  goal: string;
  task_type?: string;
  system_prompt?: string;
  tool_context?: Record<string, unknown>;
  provider_name?: string | null;
  agent_name?: string | null;
  priority?: string;
  max_tokens_budget?: number | null;
  max_parallelism?: number | null;
  requester_identity?: string | null;
  requester_roles?: string[];
  tenant_id?: string | null;
  deadline?: number | null;
}

/** Mirrors `TaskRecordOut` in `schemas.py`. */
export interface TaskRecordOut {
  task_id: string;
  status: string;
  goal: string;
  agent_name: string | null;
  tenant_id: string | null;
  result: unknown;
  error: string | null;
  retry_count: number;
  created_at: number;
  updated_at: number;
  control_signal: string | null;
  approval_id: string | null;
}

/** Mirrors `PendingApprovalOut` in `schemas.py`. */
export interface PendingApprovalOut {
  approval_id: string;
  task_id: string;
  tool_name: string;
  tool_call_id: string;
  reason: string;
  requested_at: number;
  status: string;
  resolved_at: number | null;
}

/** Mirrors `AgentEventOut` in `schemas.py`. */
export interface AgentEventOut {
  type: string;
  agent_id: string;
  task_id: string | null;
  payload: Record<string, unknown>;
  ts: number;
}

/** Mirrors `PolicyOut` in `schemas.py`. */
export interface PolicyOut {
  subject: string;
  tool_pattern: string;
  rule: string;
  max_calls: number;
  window_seconds: number;
  reason: string;
}

/** Mirrors `PolicyListOut` in `schemas.py`. */
export interface PolicyListOut {
  policies: PolicyOut[];
  default_deny: boolean;
}

/** Mirrors `PolicyIn` in `schemas.py`. */
export interface PolicyIn {
  subject: string;
  tool_pattern: string;
  rule: string;
  max_calls?: number;
  window_seconds?: number;
  reason?: string;
}

/** Mirrors `GuardrailsOut` in `schemas.py`. */
export interface GuardrailsOut {
  input: string[];
  output: string[];
}

/** Mirrors `CostOut` in `schemas.py`. */
export interface CostOut {
  tenant_id: string;
  budget: number | null;
  remaining: number | null;
  total_tokens: number;
  note: string;
}

/** Mirrors `OrchestratorAgentOut` in `schemas.py`. */
export interface OrchestratorAgentOut {
  name: string;
  description: string;
  /** Static, cosmetic label from AgentSpec.project -- may be stale/absent; prefer `projects`. */
  project: string | null;
  /** Every project_id with a real ProjectAgentBinding for this agent right now. */
  projects: string[];
  capabilities: string[];
  tools: string[];
  provider_name: string | null;
  has_dedicated_provider: boolean;
}

/** Mirrors `GatewayCallOut` in `schemas.py`. */
export interface GatewayCallOut {
  provider_name: string;
  duration_ms: number;
  success: boolean;
  error: string | null;
}

/** Mirrors `GatewayCallsOut` in `schemas.py`. `configured: false` means no AIGateway is
 * wired into this API service at all -- distinct from `configured: true` with an empty
 * `calls` list, which just means nothing has been routed through it yet. */
export interface GatewayCallsOut {
  configured: boolean;
  calls: GatewayCallOut[];
}

/** One of "allowed" | "needs_approval" | "rate_limited" | "blocked". Mirrors
 * `agentic_kernel.management.policy.CapabilityStatus`. */
export type CapabilityStatusValue = "allowed" | "needs_approval" | "rate_limited" | "blocked";

/** Mirrors `CapabilityOut` in `schemas.py`. */
export interface CapabilityOut {
  tool_name: string;
  tool_description: string;
  status: CapabilityStatusValue;
  reason: string;
  max_calls: number | null;
  window_seconds: number | null;
}

/** Mirrors `ComplianceFindingOut` in `schemas.py`. */
export interface ComplianceFindingOut {
  severity: string;
  message: string;
  code: string;
}

/** Mirrors `ComplianceReportOut` in `schemas.py` (the `?format=json` shape of
 * `GET /governance/report`). */
export interface ComplianceReportOut {
  generated_at: number;
  policy_count: number;
  default_deny: boolean;
  policies_by_rule: Record<string, number>;
  event_counts: Record<string, number>;
  pending_approvals: number;
  resolved_approvals: number;
  total_tokens: number | null;
  input_guardrail_names: string[];
  output_guardrail_names: string[];
  findings: ComplianceFindingOut[];
}

/** Mirrors `TenantSummaryOut` in `schemas.py`. */
export interface TenantSummaryOut {
  tenant_id: string;
  budget: number | null;
  remaining: number | null;
  total_tokens: number;
}

/** Mirrors `AgentSummaryOut` in `schemas.py`. */
export interface AgentSummaryOut {
  agent_name: string;
  budget: number | null;
  remaining: number | null;
  total_tokens: number;
}

/** Mirrors `AgentCostOut` in `schemas.py`. */
export interface AgentCostOut {
  agent_name: string;
  budget: number | null;
  remaining: number | null;
  total_tokens: number;
  note: string;
}

/** Mirrors `ProjectOut` in `schemas.py`. */
export interface ProjectOut {
  project_id: string;
  name: string;
  description: string;
  status: string;
  owner: string;
  environment: string;
  package_version: string;
  endpoint: string;
  metadata: Record<string, string>;
  /** "registered" | "active" | "stale" | "disabled" -- see `Project.effective_status()`. */
  registration_status: string;
  last_heartbeat_at: number | null;
  agent_count: number;
  budget: number | null;
  remaining: number | null;
  total_tokens: number;
}

/** Mirrors `RegisteredAgentOut` in `schemas.py` -- an externally-registered agent's
 * metadata (distinct from `OrchestratorAgentOut`, which describes a real, loaded,
 * executable Agent Definition). See `agent_code_loaded` to tell "registered" from
 * "actually runnable" apart. */
export interface RegisteredAgentOut {
  project_id: string;
  name: string;
  display_name: string;
  description: string;
  capabilities: string[];
  version: string;
  provider_name: string | null;
  model_name: string | null;
  tools: string[];
  metadata: Record<string, string>;
  status: string;
  /** "disabled" | "not_installed" (registered, no trusted code loaded centrally --
   * "Registered but not installed") | "installed" (real AgentSpec loaded, ready to run --
   * "Installed and executable") | "stale" (installed, hasn't heartbeat recently). See
   * `AgentRegistrationRecord.effective_status()` for exact precedence. */
  effective_status: string;
  agent_code_loaded: boolean;
  created_at: number;
  updated_at: number;
  last_heartbeat_at: number | null;
}

/** Body for `POST /projects`. Mirrors `ProjectIn` in `schemas.py`. */
export interface ProjectIn {
  project_id: string;
  name: string;
  description?: string;
}

/** One resolved Project-Agent Binding. Mirrors `ProjectAgentBindingOut` in `schemas.py`.
 * `tool_context_keys` is keys only -- see that schema's docstring for why values are
 * never returned by this API. */
export interface ProjectAgentBindingOut {
  project_id: string;
  project_name: string;
  agent_name: string;
  agent_description: string;
  provider_name: string | null;
  has_dedicated_provider: boolean;
  tools: string[];
  tool_context_keys: string[];
  http_endpoint: string | null;
  has_http_secret: boolean;
}

/** Mirrors `HealthOut` in `schemas.py`. */
export interface HealthOut {
  status: string;
  worker_alive: boolean;
  queue_backend: string;
  queued: number;
  running: number;
}

/** Raised when the API responds with a non-2xx status; carries the HTTP status code and
 * the raw response body text (when available) for callers/tests to inspect. */
export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`API request failed with status ${status}: ${body}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new ApiError(response.status, body);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

// PUBLIC_INTERFACE
export async function getHealth(): Promise<HealthOut> {
  /** Fetch service/worker liveness; wraps `GET /healthz`. Not gated by the optional
   * X-API-Key (matches the backend's own unauthenticated health-check convention). */
  return request<HealthOut>("/healthz");
}

// PUBLIC_INTERFACE
export async function submitTask(body: TaskRequestIn): Promise<TaskRecordOut> {
  /** Submit a new task goal; wraps `POST /tasks`. */
  return request<TaskRecordOut>("/tasks", { method: "POST", body: JSON.stringify(body) });
}

// PUBLIC_INTERFACE
export async function listTasks(params?: { status?: string; limit?: number }): Promise<TaskRecordOut[]> {
  /** List submitted tasks, most recent first; wraps `GET /tasks`. */
  const query = new URLSearchParams();
  if (params?.status) query.set("status_filter", params.status);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return request<TaskRecordOut[]>(`/tasks${qs ? `?${qs}` : ""}`);
}

// PUBLIC_INTERFACE
export async function getTask(taskId: string): Promise<TaskRecordOut> {
  /** Fetch a single task record by id; wraps `GET /tasks/{task_id}`. */
  return request<TaskRecordOut>(`/tasks/${encodeURIComponent(taskId)}`);
}

// PUBLIC_INTERFACE
export async function pauseTask(taskId: string): Promise<void> {
  /** Request a cooperative pause of a task; wraps `POST /tasks/{task_id}/pause`. */
  await request<void>(`/tasks/${encodeURIComponent(taskId)}/pause`, { method: "POST" });
}

// PUBLIC_INTERFACE
export async function resumeTask(taskId: string): Promise<void> {
  /** Request resume of a paused/awaiting-approval task; wraps `POST /tasks/{task_id}/resume`. */
  await request<void>(`/tasks/${encodeURIComponent(taskId)}/resume`, { method: "POST" });
}

// PUBLIC_INTERFACE
export async function cancelTask(taskId: string): Promise<void> {
  /** Request cancellation of a task; wraps `POST /tasks/{task_id}/cancel`. */
  await request<void>(`/tasks/${encodeURIComponent(taskId)}/cancel`, { method: "POST" });
}

// PUBLIC_INTERFACE
export async function listApprovals(): Promise<PendingApprovalOut[]> {
  /** List all pending approvals; wraps `GET /approvals`. */
  return request<PendingApprovalOut[]>("/approvals");
}

// PUBLIC_INTERFACE
export async function approve(approvalId: string): Promise<PendingApprovalOut> {
  /** Approve a pending tool call; wraps `POST /approvals/{approval_id}/approve`. */
  return request<PendingApprovalOut>(`/approvals/${encodeURIComponent(approvalId)}/approve`, { method: "POST" });
}

// PUBLIC_INTERFACE
export async function reject(approvalId: string): Promise<PendingApprovalOut> {
  /** Reject a pending tool call; wraps `POST /approvals/{approval_id}/reject`. */
  return request<PendingApprovalOut>(`/approvals/${encodeURIComponent(approvalId)}/reject`, { method: "POST" });
}

// PUBLIC_INTERFACE
export function subscribeEvents(
  agentId: string | undefined,
  onEvent: (event: AgentEventOut) => void,
  onError?: (error: Event) => void,
): EventSource {
  /** Open a live Server-Sent-Events connection against `GET /events/stream`, invoking
   * `onEvent` for every event received. Returns the underlying `EventSource` so callers
   * can `.close()` it (e.g. on component unmount). */
  const query = agentId ? `?agent_id=${encodeURIComponent(agentId)}` : "";
  const source = new EventSource(`${API_BASE_URL}/events/stream${query}`);
  source.onmessage = (message) => {
    try {
      onEvent(JSON.parse(message.data) as AgentEventOut);
    } catch {
      // Ignore malformed frames; the connection remains open for subsequent events.
    }
  };
  if (onError) {
    source.onerror = onError;
  }
  return source;
}

// PUBLIC_INTERFACE
export async function getRecentEvents(params?: { agentId?: string; limit?: number }): Promise<AgentEventOut[]> {
  /** Fetch recently buffered events (SSE fallback); wraps `GET /events/recent`. */
  const query = new URLSearchParams();
  if (params?.agentId) query.set("agent_id", params.agentId);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return request<AgentEventOut[]>(`/events/recent${qs ? `?${qs}` : ""}`);
}

// PUBLIC_INTERFACE
export async function getOrchestratorAgents(): Promise<OrchestratorAgentOut[]> {
  /** List agents registered with the Orchestrator (empty when not configured); wraps
   * `GET /orchestrator/agents`. */
  return request<OrchestratorAgentOut[]>("/orchestrator/agents");
}

// PUBLIC_INTERFACE
export async function reloadOrchestratorAgents(): Promise<OrchestratorAgentOut[]> {
  /** Re-scan the agents/ directory and installed-package entry points into the live
   * AgentRegistry, without restarting the API process -- how a project's agent package
   * `pip install`-ed after this API started becomes executable. Wraps
   * `POST /orchestrator/agents/reload`; returns the full, now-current agent list. */
  return request<OrchestratorAgentOut[]>("/orchestrator/agents/reload", { method: "POST" });
}

// PUBLIC_INTERFACE
export async function getGatewayCalls(limit?: number): Promise<GatewayCallsOut> {
  /** Fetch recent AI Gateway call records plus whether a gateway is configured at all;
   * wraps `GET /gateway/calls`. */
  const qs = limit ? `?limit=${limit}` : "";
  return request<GatewayCallsOut>(`/gateway/calls${qs}`);
}

// PUBLIC_INTERFACE
export async function getCost(tenantId: string): Promise<CostOut> {
  /** Fetch budget/remaining/total-tokens for a tenant; wraps `GET /cost/{tenant_id}`. */
  return request<CostOut>(`/cost/${encodeURIComponent(tenantId)}`);
}

// PUBLIC_INTERFACE
export async function getPolicy(): Promise<PolicyListOut> {
  /** Fetch all configured policies plus the default-deny flag; wraps `GET /policy`. */
  return request<PolicyListOut>("/policy");
}

// PUBLIC_INTERFACE
export async function addPolicy(body: PolicyIn): Promise<PolicyListOut> {
  /** Add one rule to the live policy engine; wraps `POST /policy`. Takes effect
   * immediately, but is not persisted across an API restart. */
  return request<PolicyListOut>("/policy", { method: "POST", body: JSON.stringify(body) });
}

// PUBLIC_INTERFACE
export async function removePolicy(index: number): Promise<PolicyListOut> {
  /** Remove the policy at `index` (as listed by `getPolicy`); wraps `DELETE /policy/{index}`. */
  return request<PolicyListOut>(`/policy/${index}`, { method: "DELETE" });
}

// PUBLIC_INTERFACE
export async function getGuardrails(): Promise<GuardrailsOut> {
  /** Fetch configured input/output guardrail names; wraps `GET /guardrails`. */
  return request<GuardrailsOut>("/guardrails");
}

// PUBLIC_INTERFACE
export async function getGovernanceReport(): Promise<string> {
  /** Fetch the current compliance report as Markdown text; wraps `GET /governance/report`. */
  return request<string>("/governance/report");
}

// PUBLIC_INTERFACE
export async function getGovernanceReportJson(): Promise<ComplianceReportOut> {
  /** Fetch the current compliance report as structured JSON (health banners, findings
   * lists); wraps `GET /governance/report?format=json`. */
  return request<ComplianceReportOut>("/governance/report?format=json");
}

// PUBLIC_INTERFACE
export async function getAgentCapabilities(
  agentName: string,
  params?: { roles?: string[]; tenantId?: string },
): Promise<CapabilityOut[]> {
  /** Fetch the resolved capability matrix for one agent (every tool, with its current
   * governance status); wraps `GET /agents/{agent_name}/capabilities`. Read-only --
   * never affects real enforcement or consumes a rate-limit slot. */
  const query = new URLSearchParams();
  for (const role of params?.roles ?? []) query.append("role", role);
  if (params?.tenantId) query.set("tenant_id", params.tenantId);
  const qs = query.toString();
  return request<CapabilityOut[]>(`/agents/${encodeURIComponent(agentName)}/capabilities${qs ? `?${qs}` : ""}`);
}

// PUBLIC_INTERFACE
export async function listTenants(): Promise<TenantSummaryOut[]> {
  /** List every tenant with a configured token budget; wraps `GET /tenants`. */
  return request<TenantSummaryOut[]>("/tenants");
}

// PUBLIC_INTERFACE
export async function setTenantBudget(tenantId: string, maxTokens: number): Promise<CostOut> {
  /** Set (create, raise, or lower) a tenant's token budget cap; wraps `PUT
   * /cost/{tenant_id}`. Also how a brand-new tenant/project first gets connected to cost
   * tracking. */
  return request<CostOut>(`/cost/${encodeURIComponent(tenantId)}`, {
    method: "PUT",
    body: JSON.stringify({ max_tokens: maxTokens }),
  });
}

// PUBLIC_INTERFACE
export async function listAgentBudgets(): Promise<AgentSummaryOut[]> {
  /** List every agent with a configured token budget; wraps `GET /agent-budgets`. An agent
   * budget caps that agent's spend across every project that uses it -- independent of any
   * one project's own tenant-level cap (see `setTenantBudget`). */
  return request<AgentSummaryOut[]>("/agent-budgets");
}

// PUBLIC_INTERFACE
export async function setAgentBudget(agentName: string, maxTokens: number): Promise<AgentCostOut> {
  /** Set (create, raise, or lower) an agent's token budget cap; wraps
   * `PUT /agents/{agent_name}/cost`. */
  return request<AgentCostOut>(`/agents/${encodeURIComponent(agentName)}/cost`, {
    method: "PUT",
    body: JSON.stringify({ max_tokens: maxTokens }),
  });
}

// PUBLIC_INTERFACE
export async function listProjects(): Promise<ProjectOut[]> {
  /** List every registered project, each with its current agent-binding count; wraps
   * `GET /projects`. */
  return request<ProjectOut[]>("/projects");
}

// PUBLIC_INTERFACE
export async function getProject(projectId: string): Promise<ProjectOut> {
  /** Fetch one project by id; wraps `GET /projects/{project_id}`. */
  return request<ProjectOut>(`/projects/${encodeURIComponent(projectId)}`);
}

// PUBLIC_INTERFACE
export async function createProject(body: ProjectIn): Promise<ProjectOut> {
  /** Register a new project (or update an existing one's name/description); wraps
   * `POST /projects`. */
  return request<ProjectOut>("/projects", { method: "POST", body: JSON.stringify(body) });
}

// PUBLIC_INTERFACE
export async function disableProject(projectId: string): Promise<void> {
  /** Admin kill switch: reject new tasks for every agent this project uses. Wraps
   * `POST /projects/{project_id}/disable` -- gated by the console's own X-API-Key, unlike
   * the project's own self-service disable under /api/v1/registry. */
  await request(`/projects/${encodeURIComponent(projectId)}/disable`, { method: "POST" });
}

// PUBLIC_INTERFACE
export async function enableProject(projectId: string): Promise<void> {
  /** Re-enable a project disabled via `disableProject`; wraps `POST /projects/{project_id}/enable`. */
  await request(`/projects/${encodeURIComponent(projectId)}/enable`, { method: "POST" });
}

// PUBLIC_INTERFACE
export async function disableProjectAgent(projectId: string, agentName: string): Promise<void> {
  /** Admin kill switch for one project's use of one agent; wraps
   * `POST /projects/{project_id}/agents/{agent_name}/disable`. */
  await request(`/projects/${encodeURIComponent(projectId)}/agents/${encodeURIComponent(agentName)}/disable`, {
    method: "POST",
  });
}

// PUBLIC_INTERFACE
export async function enableProjectAgent(projectId: string, agentName: string): Promise<void> {
  /** Re-enable a project-agent binding disabled via `disableProjectAgent`; wraps
   * `POST /projects/{project_id}/agents/{agent_name}/enable`. */
  await request(`/projects/${encodeURIComponent(projectId)}/agents/${encodeURIComponent(agentName)}/enable`, {
    method: "POST",
  });
}

// PUBLIC_INTERFACE
export async function listProjectAgents(projectId: string): Promise<ProjectAgentBindingOut[]> {
  /** List a project's resolved agent bindings -- which reusable Agent Definitions it
   * uses, and with what model/tools/context; wraps `GET /projects/{project_id}/agents`. */
  return request<ProjectAgentBindingOut[]>(`/projects/${encodeURIComponent(projectId)}/agents`);
}

// PUBLIC_INTERFACE
export async function listAgentProjects(agentName: string): Promise<ProjectAgentBindingOut[]> {
  /** List every project using one Agent Definition, each resolved to that project's own
   * binding -- the reverse of `listProjectAgents`; wraps `GET /agents/{agent_name}/projects`. */
  return request<ProjectAgentBindingOut[]>(`/agents/${encodeURIComponent(agentName)}/projects`);
}

// PUBLIC_INTERFACE
export async function listRegisteredProjectAgents(projectId: string): Promise<RegisteredAgentOut[]> {
  /** List the agent metadata a project has self-registered via the SDK/registration API
   * (name/description/capabilities/version/tools/health) -- distinct from
   * `listProjectAgents`, which shows resolved *bindings* against real, loaded Agent
   * Definitions. A newly `register_agent()`-ed agent shows up here immediately even
   * before any binding exists, or before its real code is installed centrally (see
   * `agent_code_loaded`). Wraps `GET /api/v1/registry/projects/{project_id}/agents`. */
  return request<RegisteredAgentOut[]>(`/api/v1/registry/projects/${encodeURIComponent(projectId)}/agents`);
}
