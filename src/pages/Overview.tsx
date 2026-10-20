import {
  BarChart3,
  BookOpen,
  Boxes,
  Cog,
  Cpu,
  Download,
  Terminal,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  getGovernanceReportJson,
  getHealth,
  getOrchestratorAgents,
  listProjects,
  listRegisteredProjectAgents,
  listTasks,
  listTenants,
  type RegisteredAgentOut,
} from "../api/client";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";

type HealthLevel = "good" | "warning" | "risk";

const HEALTH_STYLES: Record<HealthLevel, string> = {
  good: "border-emerald-800/60 bg-emerald-950/40 text-emerald-200",
  warning: "border-amber-800/60 bg-amber-950/40 text-amber-200",
  risk: "border-red-800/60 bg-red-950/40 text-red-200",
};

const HEALTH_LABELS: Record<HealthLevel, string> = {
  good: "Fully governed",
  warning: "Some gaps",
  risk: "Wide open",
};

// Plain-language rewrite of each finding `code` (see agentic_kernel/governance/report.py),
// so this page never shows an engineer-facing message (class names, enum values) to a
// non-technical viewer. Keyed by the finding's stable `code`, not its `message` text --
// the full technical wording is still available on the Governance page.
const FINDING_PLAIN_TEXT: Record<string, string> = {
  allow_by_default: "No approval is required for any agent action -- anything is allowed unless specifically blocked.",
  no_policies: "No rules have been set up at all -- every agent can use every tool with no restriction.",
  no_input_guardrails: "Nothing is checking incoming requests for manipulation attempts (prompt injection).",
  no_output_guardrails: "Nothing is checking agent responses for leaked or unsafe content before they go out.",
  no_pii_guardrail: "Nothing is checking for personal information (names, emails, etc.) in what agents send or receive.",
  pending_approvals: "Some agent actions are waiting for a manager's approval -- see the Approvals page.",
  no_approval_gates: "No agent action currently requires a human to sign off before it happens.",
};

function plainFindingText(finding: { code: string; message: string }): string {
  return FINDING_PLAIN_TEXT[finding.code] ?? finding.message;
}

// Cycled by index, not looked up per-project -- there's no per-project icon/color field in
// the data model, so this is purely a visual pattern (like a favicon initial), never a
// stand-in for real per-project metadata.
const PROJECT_ICONS = [Boxes, BookOpen, BarChart3, Terminal, Cpu, Cog];
const PROJECT_ICON_STYLES = [
  "bg-cyan-500/15 text-cyan-300",
  "bg-violet-500/15 text-violet-300",
  "bg-emerald-500/15 text-emerald-300",
  "bg-orange-500/15 text-orange-300",
  "bg-blue-500/15 text-blue-300",
  "bg-pink-500/15 text-pink-300",
];

function registrationDotClassName(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-400";
    case "stale":
      return "bg-amber-400";
    case "disabled":
      return "bg-red-400";
    default:
      return "bg-blue-400"; // "registered"
  }
}

// PUBLIC_INTERFACE
export default function Overview() {
  /** The one screen management actually looks at: kernel health, top-line KPIs (real
   * projects/agents/installed-agent/worker/token counts -- no invented numbers), the
   * project/agent/worker architecture at a glance, and recent task activity. Every number
   * here comes from a real API call; a metric with no real backing data (e.g. a daily
   * token time series -- the kernel doesn't track that) is simply not shown rather than
   * faked. */
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: listProjects, refetchInterval: 15000 });
  const agentsQuery = useQuery({ queryKey: ["orchestrator", "agents"], queryFn: getOrchestratorAgents });
  const tenantsQuery = useQuery({ queryKey: ["tenants"], queryFn: listTenants, refetchInterval: 15000 });
  const reportQuery = useQuery({ queryKey: ["governance", "report", "json"], queryFn: getGovernanceReportJson });
  const healthQuery = useQuery({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 10000 });
  const tasksQuery = useQuery({
    queryKey: ["tasks", { limit: 8 }],
    queryFn: () => listTasks({ limit: 8 }),
    refetchInterval: 5000,
  });
  const registeredAgentsQuery = useQuery({
    queryKey: ["registered-agents", "all"],
    queryFn: async () => {
      const projects = await listProjects();
      const perProject = await Promise.all(projects.map((p) => listRegisteredProjectAgents(p.project_id)));
      return perProject.flat();
    },
    enabled: (projectsQuery.data?.length ?? 0) > 0,
  });

  const projects = projectsQuery.data ?? [];
  const agents = agentsQuery.data ?? [];
  const tenants = tenantsQuery.data ?? [];
  const findings = reportQuery.data?.findings ?? [];
  const registeredAgents: RegisteredAgentOut[] = registeredAgentsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];

  const riskCount = findings.filter((f) => f.severity === "risk").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const health: HealthLevel = riskCount > 0 ? "risk" : warningCount > 0 ? "warning" : "good";

  const totalSpent = tenants.reduce((sum, t) => sum + t.total_tokens, 0);
  const totalBudget = tenants.reduce((sum, t) => sum + (t.budget ?? 0), 0);

  // "Connected" = genuinely runnable right now, whether that's a trusted in-process
  // AgentSpec ("installed"/"stale") or an externally-hosted agent reachable through the
  // generic HTTP adapter ("executable_via_http") -- see
  // AgentRegistrationRecord.effective_status(). Only "not_installed" (metadata with no
  // way to actually run) and "disabled" are excluded, since those two are the only
  // statuses where a task naming the agent would actually fail.
  const CONNECTED_STATUSES = new Set(["installed", "stale", "executable_via_http"]);
  const connectedCount = registeredAgents.filter((a) => CONNECTED_STATUSES.has(a.effective_status)).length;
  const totalRegistered = registeredAgents.length;

  const projectAgentCounts = new Map<string, number>();
  for (const agent of agents) {
    for (const projectId of agent.projects.length > 0 ? agent.projects : ["Unassigned"]) {
      projectAgentCounts.set(projectId, (projectAgentCounts.get(projectId) ?? 0) + 1);
    }
  }
  const projectCount = projects.length;

  const maxTenantTokens = Math.max(1, ...tenants.map((t) => t.total_tokens));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-slate-400 mt-1">Your agentic infrastructure at a glance.</p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium ${
            healthQuery.data?.worker_alive
              ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-200"
              : "border-red-800/60 bg-red-950/40 text-red-200"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${healthQuery.data?.worker_alive ? "bg-emerald-400" : "bg-red-400"}`}
          />
          <div className="leading-tight">
            <div>{healthQuery.data?.worker_alive ? "Kernel Healthy" : "Kernel Degraded"}</div>
            <div className="text-xs font-normal opacity-80">
              {healthQuery.isLoading ? "Checking…" : healthQuery.data?.worker_alive ? "All systems operational" : "Worker thread not running"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Boxes}
          iconClassName="bg-cyan-500/15 text-cyan-300"
          label="Connected Projects"
          value={String(projectCount)}
        />
        <StatCard
          icon={Users}
          iconClassName="bg-violet-500/15 text-violet-300"
          label="Active Agents"
          value={String(agents.length)}
          caption={`across ${projectAgentCounts.size} project${projectAgentCounts.size === 1 ? "" : "s"}`}
        />
        <StatCard
          icon={Download}
          iconClassName="bg-emerald-500/15 text-emerald-300"
          label="Connected Agents"
          value={totalRegistered > 0 ? `${connectedCount} / ${totalRegistered}` : "0 / 0"}
          caption={totalRegistered > 0 && connectedCount === totalRegistered ? "All executable" : totalRegistered > 0 ? "Some not runnable" : "No agents registered via SDK yet"}
          captionClassName={totalRegistered > 0 && connectedCount === totalRegistered ? "text-emerald-400" : undefined}
        />
        <StatCard
          icon={Cpu}
          iconClassName="bg-blue-500/15 text-blue-300"
          label="Central Worker"
          value={healthQuery.data ? (healthQuery.data.worker_alive ? "1 / 1" : "0 / 1") : "…"}
          caption={healthQuery.data?.worker_alive ? "Executable" : healthQuery.isLoading ? undefined : "Offline"}
          captionClassName={healthQuery.data?.worker_alive ? "text-emerald-400" : "text-red-400"}
        />
        <StatCard
          icon={BarChart3}
          iconClassName="bg-orange-500/15 text-orange-300"
          label="Total Token Usage"
          value={totalSpent.toLocaleString()}
          caption={totalBudget > 0 ? `of ${totalBudget.toLocaleString()} budgeted` : "no budget cap set"}
        />
      </div>

      {(reportQuery.isLoading || findings.length > 0) && (
        <div className={`border rounded-xl px-4 py-3 ${HEALTH_STYLES[health]}`}>
          <div className="font-semibold text-sm">{HEALTH_LABELS[health]}</div>
          {reportQuery.isLoading ? (
            <p className="text-sm mt-1 opacity-80">Checking governance status…</p>
          ) : (
            <ul className="text-sm mt-2 space-y-1 list-disc list-inside opacity-90">
              {findings.slice(0, 3).map((f, i) => (
                <li key={i}>{plainFindingText(f)}</li>
              ))}
            </ul>
          )}
          <Link to="/governance" className="text-sm underline mt-2 inline-block opacity-90">
            View full governance detail →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">Connected Projects</h2>
            <Link to="/projects" className="text-xs text-cyan-400 hover:underline">
              View all →
            </Link>
          </div>
          {projectsQuery.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {!projectsQuery.isLoading && projects.length === 0 && (
            <p className="text-sm text-slate-500">No projects registered yet.</p>
          )}
          <div className="space-y-1">
            {projects.slice(0, 6).map((project, i) => {
              const Icon = PROJECT_ICONS[i % PROJECT_ICONS.length];
              return (
                <Link
                  key={project.project_id}
                  to={`/projects/${encodeURIComponent(project.project_id)}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-800/50"
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${PROJECT_ICON_STYLES[i % PROJECT_ICON_STYLES.length]}`}>
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{project.name}</div>
                    <div className="text-xs text-slate-500 truncate">{project.description || project.project_id}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                    <span className={`h-1.5 w-1.5 rounded-full ${registrationDotClassName(project.registration_status)}`} />
                    {project.registration_status}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-medium text-sm">Token Usage by Project</h2>
          </div>
          <div className="text-2xl font-semibold">{totalSpent.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mb-4">total tokens across every project</div>
          {tenantsQuery.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {!tenantsQuery.isLoading && tenants.length === 0 && (
            <p className="text-sm text-slate-500">No projects have recorded any spend yet.</p>
          )}
          <div className="space-y-2.5">
            {tenants
              .slice()
              .sort((a, b) => b.total_tokens - a.total_tokens)
              .slice(0, 6)
              .map((tenant) => (
                <div key={tenant.tenant_id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 truncate">{tenant.tenant_id}</span>
                    <span className="text-slate-500 shrink-0 ml-2">{tenant.total_tokens.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400"
                      style={{ width: `${Math.max(3, (tenant.total_tokens / maxTenantTokens) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-sm">Recent Tasks</h2>
          <Link to="/tasks" className="text-xs text-cyan-400 hover:underline">
            View all →
          </Link>
        </div>
        {tasksQuery.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {!tasksQuery.isLoading && tasks.length === 0 && <p className="text-sm text-slate-500">No tasks submitted yet.</p>}
        {tasks.length > 0 && (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm border-collapse min-w-[640px]">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-800 text-xs">
                  <th className="py-2 px-1 font-medium">Task</th>
                  <th className="py-2 px-1 font-medium">Project</th>
                  <th className="py-2 px-1 font-medium">Agent</th>
                  <th className="py-2 px-1 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.task_id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                    <td className="py-2 px-1">
                      <Link to={`/tasks/${task.task_id}`} className="hover:underline">
                        {task.goal.length > 48 ? `${task.goal.slice(0, 48)}…` : task.goal}
                      </Link>
                    </td>
                    <td className="py-2 px-1 text-slate-400">{task.tenant_id ?? "—"}</td>
                    <td className="py-2 px-1 text-slate-400">{task.agent_name ?? "—"}</td>
                    <td className="py-2 px-1">
                      <StatusBadge status={task.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
