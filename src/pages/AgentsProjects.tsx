import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Link } from "react-router-dom";

import {
  API_BASE_URL,
  ApiError,
  disableProjectAgent,
  enableProjectAgent,
  getAgentCapabilities,
  getOrchestratorAgents,
  listAgentProjects,
  listProjects,
  listRegisteredProjectAgents,
  reloadOrchestratorAgents,
  type OrchestratorAgentOut,
} from "../api/client";
import CapabilityBadge from "../components/CapabilityBadge";
import StatusBadge from "../components/StatusBadge";

// PUBLIC_INTERFACE
export default function AgentsProjects() {
  /** Agents & Projects page: one row per registered agent (name, plain description,
   * owning project, tool count), expandable to that agent's full resolved capability
   * matrix. This is the "what agents exist and what can they do" screen from
   * UI_REQUIREMENTS.md §4.2/§4.3 -- management-readable by default, no raw policy syntax
   * unless you expand a row. */
  const { data: agents, isLoading, isError } = useQuery({
    queryKey: ["orchestrator", "agents"],
    queryFn: getOrchestratorAgents,
    refetchInterval: 10000,
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const reloadMutation = useMutation({
    mutationFn: reloadOrchestratorAgents,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orchestrator", "agents"] }),
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Agents &amp; Projects</h1>
        <p className="text-sm text-gray-500 mt-1">
          Every agent connected to Tricortex, however it's connected — installed agents running as trusted code
          inside Tricortex itself, and externally-hosted agents reached over HTTP (the generic adapter). One list,
          one place to control all of it.
        </p>
      </div>

      <AllConnectedAgents />

      <div className="flex items-center justify-between gap-3 flex-wrap border-t border-gray-200 dark:border-gray-800 pt-6">
        <h2 className="text-lg font-semibold">Installed agents (trusted code, run in-process)</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => reloadMutation.mutate()}
            disabled={reloadMutation.isPending}
            className="rounded border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-900"
            title="Re-scan agents/ and installed package entry points -- picks up a newly pip-installed agent package without restarting this API"
          >
            {reloadMutation.isPending ? "Rescanning…" : "Rescan for installed agents"}
          </button>
        </div>
      </div>
      {reloadMutation.isError && (
        <p className="text-sm text-red-600">
          Rescan failed: {reloadMutation.error instanceof ApiError ? reloadMutation.error.message : "unknown error"}
        </p>
      )}
      {reloadMutation.isSuccess && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Rescan complete — {reloadMutation.data.length} agent{reloadMutation.data.length === 1 ? "" : "s"} now
          registered centrally.
        </p>
      )}

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && <p className="text-sm text-red-600">Failed to load agents.</p>}
      {!isLoading && !isError && (agents?.length ?? 0) === 0 && (
        <p className="text-sm text-gray-500">
          No agents registered — the API service is running in single-provider mode.
        </p>
      )}

      <div className="space-y-3">
        {agents?.map((agent) => (
          <div key={agent.name} className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(expanded === agent.name ? null : agent.name)}
              className="w-full text-left px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{agent.name}</span>
                  {agent.projects.length > 0 ? (
                    agent.projects.map((projectId) => (
                      <span
                        key={projectId}
                        className="badge bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      >
                        {projectId}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">not yet assigned to a project</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{agent.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {agent.tools.length} tool{agent.tools.length === 1 ? "" : "s"}
                  {agent.has_dedicated_provider
                    ? " · uses its own dedicated provider"
                    : agent.provider_name
                      ? ` · prefers vendor "${agent.provider_name}"`
                      : " · uses platform default provider"}
                </p>
              </div>
              <span className="text-sm text-gray-400">{expanded === agent.name ? "▲" : "▼"}</span>
            </button>
            {expanded === agent.name && (
              <>
                <AgentCapabilities agentName={agent.name} />
                <UsedByProjects agentName={agent.name} />
                <HowToUse agent={agent} />
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// One row per agent registered by any project (self-declared metadata, see
// RegisteredAgentOut), merged across every project in one request per project -- this is
// the one place that shows EVERY agent connected to Tricortex regardless of how, since
// the "Installed agents" list below only ever shows trusted, centrally-loaded code
// (GET /orchestrator/agents). `agent_code_loaded` on each row is what tells "installed"
// and "HTTP-adapter-only" apart without a separate lookup.
function AllConnectedAgents() {
  const queryClient = useQueryClient();
  const { data: projects, isLoading: projectsLoading, isError: projectsError } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const { data: rows, isLoading: rowsLoading, isError: rowsError } = useQuery({
    queryKey: ["all-connected-agents", projects?.map((p) => p.project_id)],
    queryFn: async () => {
      const perProject = await Promise.all(
        (projects ?? []).map(async (project) => {
          const agents = await listRegisteredProjectAgents(project.project_id);
          return agents.map((agent) => ({ ...agent, project_name: project.name }));
        }),
      );
      return perProject.flat();
    },
    enabled: !!projects,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ projectId, agentName, enable }: { projectId: string; agentName: string; enable: boolean }) =>
      enable ? enableProjectAgent(projectId, agentName) : disableProjectAgent(projectId, agentName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-connected-agents"] }),
  });

  const isLoading = projectsLoading || rowsLoading;
  const isError = projectsError || rowsError;

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold">All connected agents</h2>
      </div>
      {isLoading && <p className="text-sm text-gray-500 px-4 py-3">Loading…</p>}
      {isError && <p className="text-sm text-red-600 px-4 py-3">Failed to load connected agents.</p>}
      {!isLoading && !isError && (rows?.length ?? 0) === 0 && (
        <p className="text-sm text-gray-500 px-4 py-3">No agent has been registered by any project yet.</p>
      )}
      {!!rows?.length && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <th className="py-2 px-4">Agent</th>
              <th className="py-2 px-4">Project</th>
              <th className="py-2 px-4">Connection</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">Control</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.project_id}:${row.name}`}
                className="border-b border-gray-100 dark:border-gray-900 align-top"
              >
                <td className="py-2 px-4">
                  <div className="font-medium">{row.display_name || row.name}</div>
                  <div className="text-xs text-gray-500">{row.description}</div>
                </td>
                <td className="py-2 px-4">
                  <Link to={`/projects/${encodeURIComponent(row.project_id)}`} className="hover:underline">
                    {row.project_name}
                  </Link>
                </td>
                <td className="py-2 px-4 text-xs text-gray-600 dark:text-gray-400">
                  {row.agent_code_loaded ? "Installed (trusted code)" : "HTTP adapter (external)"}
                </td>
                <td className="py-2 px-4">
                  <StatusBadge status={row.effective_status} />
                </td>
                <td className="py-2 px-4">
                  <button
                    type="button"
                    onClick={() =>
                      toggleMutation.mutate({
                        projectId: row.project_id,
                        agentName: row.name,
                        enable: row.effective_status === "disabled",
                      })
                    }
                    disabled={toggleMutation.isPending}
                    className="rounded border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs font-medium disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    {row.effective_status === "disabled" ? "Enable" : "Disable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {toggleMutation.isError && (
        <p className="text-sm text-red-600 px-4 py-3">
          Action failed: {toggleMutation.error instanceof ApiError ? toggleMutation.error.message : "unknown error"}
        </p>
      )}
    </div>
  );
}

// Explains, in plain language plus one copyable example, how a team outside this UI
// actually invokes a given agent. Nobody calls an agent directly -- every request goes
// through the kernel's task queue, which is what applies this project's cost cap and
// the policies/guardrails shown above no matter who the caller is.
function HowToUse({ agent }: { agent: OrchestratorAgentOut }) {
  const tenantId = agent.projects[0] ?? "your-project";
  const example = JSON.stringify(
    {
      goal: "Describe what you want the agent to do, in plain English",
      agent_name: agent.name,
      tenant_id: tenantId,
    },
    null,
    2,
  );

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3">
      <h3 className="text-sm font-medium mb-1">How other teams use this agent</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Nobody calls <code>{agent.name}</code> directly. A team sends a request to the kernel and asks for this
        agent by name; the kernel runs it, applying this project's ("{tenantId}") cost cap and the rules shown
        above, then hands back the result. This is also true for you — submitting a task on the{" "}
        <span className="font-medium">Tasks</span> page under "Advanced" goes through the exact same path.
      </p>
      <p className="text-xs text-gray-500 mt-2 mb-1">Example request another team's system would send:</p>
      <pre className="text-xs bg-gray-900 text-gray-100 rounded p-3 overflow-x-auto">
        {`POST ${API_BASE_URL}/tasks\n${example}`}
      </pre>
    </div>
  );
}

// The reverse of a project's own "agents it uses" view (see ProjectDetail.tsx): every
// project that has a ProjectAgentBinding for this one Agent Definition, each resolved to
// that project's own model/tools -- proof the same agent can serve multiple projects
// differently without being duplicated (KERNEL_ARCHITECTURE_REVIEW.md's central claim).
function UsedByProjects({ agentName }: { agentName: string }) {
  const { data: bindings, isLoading, isError } = useQuery({
    queryKey: ["agents", agentName, "projects"],
    queryFn: () => listAgentProjects(agentName),
  });

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3">
      <h3 className="text-sm font-medium mb-1">Used by projects</h3>
      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && <p className="text-sm text-red-600">Failed to load project bindings.</p>}
      {!isLoading && !isError && (bindings?.length ?? 0) === 0 && (
        <p className="text-sm text-gray-500">No project has a specific binding for this agent yet.</p>
      )}
      <div className="space-y-1">
        {bindings?.map((binding) => (
          <div key={binding.project_id} className="text-sm flex items-center gap-2 flex-wrap">
            <Link to={`/projects/${encodeURIComponent(binding.project_id)}`} className="font-medium hover:underline">
              {binding.project_name}
            </Link>
            <span className="text-xs text-gray-500">
              {binding.has_dedicated_provider
                ? "dedicated provider"
                : binding.provider_name
                  ? `model: "${binding.provider_name}"`
                  : "platform default model"}
              {" · "}
              {binding.tools.length} tool{binding.tools.length === 1 ? "" : "s"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentCapabilities({ agentName }: { agentName: string }) {
  const { data: capabilities, isLoading, isError } = useQuery({
    queryKey: ["agents", agentName, "capabilities"],
    queryFn: () => getAgentCapabilities(agentName),
  });

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 bg-gray-50 dark:bg-gray-950">
      {isLoading && <p className="text-sm text-gray-500">Loading capabilities…</p>}
      {isError && <p className="text-sm text-red-600">Failed to load capabilities.</p>}
      {capabilities && capabilities.length === 0 && (
        <p className="text-sm text-gray-500">This agent has no tools registered.</p>
      )}
      {!!capabilities?.length && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <th className="py-1 pr-4">Tool</th>
              <th className="py-1 pr-4">Status</th>
              <th className="py-1">Reason</th>
            </tr>
          </thead>
          <tbody>
            {capabilities.map((cap) => (
              <tr key={cap.tool_name} className="border-b border-gray-100 dark:border-gray-900">
                <td className="py-1.5 pr-4">
                  <div className="font-medium">{cap.tool_name}</div>
                  <div className="text-xs text-gray-500">{cap.tool_description}</div>
                </td>
                <td className="py-1.5 pr-4 align-top">
                  <CapabilityBadge status={cap.status} />
                  {cap.status === "rate_limited" && cap.max_calls != null && (
                    <div className="text-xs text-gray-500 mt-1">
                      {cap.max_calls} calls / {cap.window_seconds}s
                    </div>
                  )}
                </td>
                <td className="py-1.5 text-gray-600 dark:text-gray-400 align-top">{cap.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
