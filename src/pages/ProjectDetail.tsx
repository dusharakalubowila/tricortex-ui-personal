import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ApiError,
  disableProject,
  disableProjectAgent,
  enableProject,
  enableProjectAgent,
  getProject,
  listProjectAgents,
  listRegisteredProjectAgents,
} from "../api/client";
import StatusBadge from "../components/StatusBadge";

// PUBLIC_INTERFACE
export default function ProjectDetail() {
  /** Project detail page: this project's own record plus every agent it has bound --
   * each row here is one `ProjectAgentBinding` resolved against its Agent Definition, so
   * it shows the *effective* model/tools/context for this project specifically, not the
   * agent's own defaults (see AgentsProjects.tsx's capability matrix for that). This is
   * the page that answers "which model and tools does this project's chat agent use" per
   * KERNEL_ARCHITECTURE_REVIEW.md's central "Agent != Project" example. */
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const invalidateProject = () => {
    queryClient.invalidateQueries({ queryKey: ["project", id] });
    queryClient.invalidateQueries({ queryKey: ["project", id, "registered-agents"] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const disableProjectMutation = useMutation({
    mutationFn: () => disableProject(id as string),
    onSuccess: invalidateProject,
  });
  const enableProjectMutation = useMutation({
    mutationFn: () => enableProject(id as string),
    onSuccess: invalidateProject,
  });
  const disableAgentMutation = useMutation({
    mutationFn: (agentName: string) => disableProjectAgent(id as string, agentName),
    onSuccess: invalidateProject,
  });
  const enableAgentMutation = useMutation({
    mutationFn: (agentName: string) => enableProjectAgent(id as string, agentName),
    onSuccess: invalidateProject,
  });
  const projectActionError = disableProjectMutation.error ?? enableProjectMutation.error;

  const projectQuery = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id as string),
    enabled: !!id,
  });
  const bindingsQuery = useQuery({
    queryKey: ["project", id, "agents"],
    queryFn: () => listProjectAgents(id as string),
    enabled: !!id,
  });
  const registeredAgentsQuery = useQuery({
    queryKey: ["project", id, "registered-agents"],
    queryFn: () => listRegisteredProjectAgents(id as string),
    enabled: !!id,
    refetchInterval: 10000,
  });

  if (projectQuery.isLoading) return <p className="text-sm text-gray-500">Loading project…</p>;
  if (projectQuery.isError || !projectQuery.data) return <p className="text-sm text-red-600">Project not found.</p>;

  const project = projectQuery.data;

  return (
    <section className="space-y-6">
      <Link to="/projects" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
        ← Back to projects
      </Link>
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <StatusBadge status={project.registration_status} />
        {project.status === "disabled" ? (
          <button
            type="button"
            onClick={() => enableProjectMutation.mutate()}
            disabled={enableProjectMutation.isPending}
            className="rounded border border-blue-500 text-blue-700 dark:text-blue-400 px-3 py-1 text-xs font-medium disabled:opacity-40"
          >
            {enableProjectMutation.isPending ? "Enabling…" : "Enable project"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => disableProjectMutation.mutate()}
            disabled={disableProjectMutation.isPending}
            className="rounded border border-red-500 text-red-700 dark:text-red-400 px-3 py-1 text-xs font-medium disabled:opacity-40"
          >
            {disableProjectMutation.isPending ? "Disabling…" : "Disable project"}
          </button>
        )}
      </div>
      {projectActionError && (
        <p className="text-sm text-red-600">
          {projectActionError instanceof ApiError ? `Action failed: ${projectActionError.message}` : "Action failed."}
        </p>
      )}
      {project.status === "disabled" && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          This project is disabled — every agent it uses rejects new tasks until it's re-enabled. Already-running
          tasks are not interrupted.
        </p>
      )}
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
        <div>
          <dt className="font-medium text-gray-900 dark:text-gray-100">Project id</dt>
          <dd className="font-mono text-xs">{project.project_id}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-900 dark:text-gray-100">Agents bound</dt>
          <dd>{project.agent_count}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-900 dark:text-gray-100">Cost</dt>
          <dd>
            {project.total_tokens.toLocaleString()}
            {project.budget != null ? ` / ${project.budget.toLocaleString()} tokens` : " tokens (no cap set)"}
          </dd>
        </div>
        {project.owner && (
          <div>
            <dt className="font-medium text-gray-900 dark:text-gray-100">Owner</dt>
            <dd>{project.owner}</dd>
          </div>
        )}
        {project.environment && (
          <div>
            <dt className="font-medium text-gray-900 dark:text-gray-100">Environment</dt>
            <dd>{project.environment}</dd>
          </div>
        )}
        {project.package_version && (
          <div>
            <dt className="font-medium text-gray-900 dark:text-gray-100">Package version</dt>
            <dd className="font-mono text-xs">{project.package_version}</dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-gray-900 dark:text-gray-100">Last heartbeat</dt>
          <dd>
            {project.last_heartbeat_at != null
              ? new Date(project.last_heartbeat_at * 1000).toLocaleString()
              : "never (registered only)"}
          </dd>
        </div>
      </dl>
      {project.description && <p className="text-sm">{project.description}</p>}

      <div>
        <h2 className="font-medium mb-2">Registered agents (self-declared metadata)</h2>
        {registeredAgentsQuery.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
        {registeredAgentsQuery.isError && (
          <p className="text-sm text-red-600">Failed to load registered agent metadata.</p>
        )}
        {!registeredAgentsQuery.isLoading &&
          !registeredAgentsQuery.isError &&
          (registeredAgentsQuery.data?.length ?? 0) === 0 && (
            <p className="text-sm text-gray-500">
              This project hasn't registered any agents via the SDK/registration API yet.
            </p>
          )}
        <div className="space-y-3">
          {registeredAgentsQuery.data?.map((agent) => (
            <div key={agent.name} className="border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-medium">{agent.display_name || agent.name}</span>
                <div className="flex items-center gap-2">
                  {/* effective_status alone already distinguishes "installed" from
                      "not_installed" (see AgentRegistrationRecord.effective_status()'s
                      precedence) -- no separate badge needed. */}
                  <StatusBadge status={agent.effective_status} />
                  {agent.status === "disabled" ? (
                    <button
                      type="button"
                      onClick={() => enableAgentMutation.mutate(agent.name)}
                      disabled={enableAgentMutation.isPending}
                      className="rounded border border-blue-500 text-blue-700 dark:text-blue-400 px-2 py-0.5 text-xs font-medium disabled:opacity-40"
                    >
                      Enable
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => disableAgentMutation.mutate(agent.name)}
                      disabled={disableAgentMutation.isPending}
                      className="rounded border border-red-500 text-red-700 dark:text-red-400 px-2 py-0.5 text-xs font-medium disabled:opacity-40"
                    >
                      Disable
                    </button>
                  )}
                </div>
              </div>
              {agent.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{agent.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {agent.version && <>v{agent.version} · </>}
                {agent.capabilities.length > 0 ? agent.capabilities.join(", ") : "no capabilities declared"}
              </p>
              {agent.tools.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">Declared tools: {agent.tools.join(", ")}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-medium mb-2">Agents used by this project</h2>
        {bindingsQuery.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
        {bindingsQuery.isError && <p className="text-sm text-red-600">Failed to load agent bindings.</p>}
        {!bindingsQuery.isLoading && !bindingsQuery.isError && (bindingsQuery.data?.length ?? 0) === 0 && (
          <p className="text-sm text-gray-500">
            No agent is bound to this project yet -- see{" "}
            <Link to="/agents" className="underline">
              Agents &amp; Projects
            </Link>{" "}
            for the full Agent Definition registry.
          </p>
        )}
        <div className="space-y-3">
          {bindingsQuery.data?.map((binding) => (
            <div
              key={binding.agent_name}
              className="border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Link to="/agents" className="font-medium hover:underline">
                  {binding.agent_name}
                </Link>
                <span className="text-xs text-gray-500">
                  {binding.http_endpoint
                    ? "routed via generic HTTP adapter"
                    : binding.has_dedicated_provider
                      ? "uses its own dedicated provider"
                      : binding.provider_name
                        ? `model: "${binding.provider_name}"`
                        : "uses platform default provider"}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{binding.agent_description}</p>
              {binding.http_endpoint && (
                <p className="text-xs text-gray-500 mt-1">
                  Endpoint: <span className="font-mono">{binding.http_endpoint}</span>{" "}
                  · {binding.has_http_secret ? "auth secret configured" : "no auth secret configured"}
                </p>
              )}
              <div className="mt-2">
                <span className="text-xs text-gray-500">Tools for this project: </span>
                {binding.tools.length === 0 ? (
                  <span className="text-xs text-gray-500">none</span>
                ) : (
                  <span className="text-xs">{binding.tools.join(", ")}</span>
                )}
              </div>
              {binding.tool_context_keys.length > 0 && (
                <div className="mt-1">
                  <span className="text-xs text-gray-500">Injected runtime context keys: </span>
                  <span className="text-xs font-mono">{binding.tool_context_keys.join(", ")}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
