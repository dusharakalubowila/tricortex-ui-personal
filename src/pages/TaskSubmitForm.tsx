import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { ApiError, listProjects, listRegisteredProjectAgents, submitTask } from "../api/client";

const AUTO_ROUTE_VALUE = "";

/** One selectable (tenant, agent) pair for the dropdown -- always a real, currently
 * registered combination, so picking one can never reproduce the "agent name typed by
 * hand doesn't match the tenant it's actually registered under" mistake (the cause of a
 * real "no such agent registered" task failure this form used to allow silently). */
interface AgentOption {
  value: string; // `${project_id}::${agent_name}` -- unique, used as the <option> value
  projectId: string;
  projectName: string;
  agentName: string;
  label: string;
  effectiveStatus: string;
}

// PUBLIC_INTERFACE
export default function TaskSubmitForm() {
  /** Task submission form: collects a `TaskRequest` (required `goal`, plus optional
   * `agent_name`+`tenant_id` picked together from a dropdown of real registered agents,
   * `provider_name`, `requester_roles`), posts it via `submitTask`, and navigates to the
   * new task's detail page on success. */
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");
  const [agentSelection, setAgentSelection] = useState(AUTO_ROUTE_VALUE);
  const [providerName, setProviderName] = useState("");
  const [requesterRoles, setRequesterRoles] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agentOptionsQuery = useQuery({
    queryKey: ["registered-agents", "all"],
    queryFn: async () => {
      const projects = await listProjects();
      const perProject = await Promise.all(
        projects.map(async (project) => {
          const agents = await listRegisteredProjectAgents(project.project_id);
          return agents.map(
            (agent): AgentOption => ({
              value: `${project.project_id}::${agent.name}`,
              projectId: project.project_id,
              projectName: project.name,
              agentName: agent.name,
              label: `${agent.display_name || agent.name} (${project.name})`,
              effectiveStatus: agent.effective_status,
            }),
          );
        }),
      );
      return perProject.flat();
    },
  });

  const agentOptions = useMemo(() => agentOptionsQuery.data ?? [], [agentOptionsQuery.data]);
  const selected = agentOptions.find((option) => option.value === agentSelection);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!goal.trim()) {
      setError("Goal is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const record = await submitTask({
        goal: goal.trim(),
        agent_name: selected?.agentName,
        provider_name: providerName.trim() || undefined,
        tenant_id: selected?.projectId,
        requester_roles: requesterRoles.trim()
          ? requesterRoles.split(",").map((role) => role.trim()).filter(Boolean)
          : undefined,
      });
      navigate(`/tasks/${record.task_id}`);
    } catch (err) {
      setError(err instanceof ApiError ? `Submission failed: ${err.message}` : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-gray-200 dark:border-gray-800 rounded p-4 mb-6">
      <h2 className="font-medium">Submit a new task</h2>
      <div>
        <label htmlFor="goal" className="block text-sm font-medium mb-1">
          Goal <span className="text-red-600">*</span>
        </label>
        <textarea
          id="goal"
          className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
          rows={2}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Describe what the agent should accomplish"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label htmlFor="agentSelection" className="block text-sm font-medium mb-1">
            Agent
          </label>
          <select
            id="agentSelection"
            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            value={agentSelection}
            onChange={(e) => setAgentSelection(e.target.value)}
          >
            <option value={AUTO_ROUTE_VALUE}>
              {agentOptionsQuery.isLoading
                ? "Loading registered agents…"
                : "Auto-route (let Tricortex pick by keyword match)"}
            </option>
            {agentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.effectiveStatus.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {selected
              ? `Will send this task to agent "${selected.agentName}" under tenant "${selected.projectId}".`
              : "No specific agent picked -- Tricortex will auto-route by keyword match across every agent, which can hit the wrong one. Pick an agent above to target a specific one reliably."}
          </p>
        </div>
        <div>
          <label htmlFor="providerName" className="block text-sm font-medium mb-1">
            Provider name (optional)
          </label>
          <input
            id="providerName"
            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="requesterRoles" className="block text-sm font-medium mb-1">
            Requester roles (comma-separated, optional)
          </label>
          <input
            id="requesterRoles"
            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            value={requesterRoles}
            onChange={(e) => setRequesterRoles(e.target.value)}
            placeholder="admin, operator"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit task"}
      </button>
    </form>
  );
}
