import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { ApiError, listProjects, listRegisteredProjectAgents, submitTask } from "../api/client";

const AUTO_AGENT_VALUE = "";
const UNSCOPED_PROJECT_VALUE = "";

// PUBLIC_INTERFACE
export default function TaskSubmitForm() {
  /** Task submission form: collects a `TaskRequest` (required `goal`, plus optional
   * `provider_name`, `requester_roles`, and a `tenant_id`+`agent_name` pair picked via two
   * dependent dropdowns).
   *
   * Project and Agent are deliberately two separate selects, not one combined one:
   * picking a Project alone (Agent left on "Auto") lets the Orchestrator's keyword router
   * pick the agent itself -- but *scoped* to that project's own registered agents only
   * (including its externally-hosted HTTP ones), never guessing across every project's
   * agents at once. That scoping is what keeps a goal-routed task's cost/governance
   * attributed to exactly one project -- see Orchestrator.resolve()'s `project_scoped_
   * routing` and `kavia-docs/CodeWiki/Quality/external-agent-governance-architecture.md`.
   * Leaving Project on "none" preserves the old global, installed-agents-only auto-route
   * for anyone who genuinely wants that. */
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");
  const [projectId, setProjectId] = useState(UNSCOPED_PROJECT_VALUE);
  const [agentName, setAgentName] = useState(AUTO_AGENT_VALUE);
  const [providerName, setProviderName] = useState("");
  const [requesterRoles, setRequesterRoles] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  const projectAgentsQuery = useQuery({
    queryKey: ["registered-agents", projectId],
    queryFn: () => listRegisteredProjectAgents(projectId),
    enabled: projectId !== UNSCOPED_PROJECT_VALUE,
  });
  const projectAgents = projectId === UNSCOPED_PROJECT_VALUE ? [] : projectAgentsQuery.data ?? [];

  function handleProjectChange(nextProjectId: string) {
    setProjectId(nextProjectId);
    setAgentName(AUTO_AGENT_VALUE); // a different project's agent list never applies to the old selection
  }

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
        agent_name: agentName || undefined,
        provider_name: providerName.trim() || undefined,
        tenant_id: projectId || undefined,
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
        <div>
          <label htmlFor="projectId" className="block text-sm font-medium mb-1">
            Project
          </label>
          <select
            id="projectId"
            // `bg-transparent` alone leaves this readable when closed (it shows the
            // page's own background through it) but the browser renders the *open*
            // dropdown list natively, ignoring the page's dark styling -- without an
            // explicit background/text color and a `color-scheme` hint, that popup (and
            // sometimes the closed control itself) renders with the OS's light-mode
            // defaults. Explicit colors + colorScheme fix it in both light and dark --
            // see Governance.tsx's policyRule select for the same fix applied earlier.
            style={{ colorScheme: "dark" }}
            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
          >
            <option value={UNSCOPED_PROJECT_VALUE}>
              {projectsQuery.isLoading ? "Loading projects…" : "None (global auto-route, installed agents only)"}
            </option>
            {projects.map((project) => (
              <option key={project.project_id} value={project.project_id}>
                {project.name} ({project.project_id})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="agentName" className="block text-sm font-medium mb-1">
            Agent
          </label>
          <select
            id="agentName"
            style={{ colorScheme: "dark" }}
            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            disabled={projectId !== UNSCOPED_PROJECT_VALUE && projectAgentsQuery.isLoading}
          >
            <option value={AUTO_AGENT_VALUE}>
              {projectId === UNSCOPED_PROJECT_VALUE
                ? "Auto-route (global, installed agents only)"
                : projectAgentsQuery.isLoading
                  ? "Loading this project's agents…"
                  : "Auto (let Tricortex pick within this project)"}
            </option>
            {projectAgents.map((agent) => (
              <option key={agent.name} value={agent.name}>
                {agent.display_name || agent.name} — {agent.effective_status.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        {projectId === UNSCOPED_PROJECT_VALUE
          ? "No project picked -- the goal text is matched by keyword against Tricortex's globally installed agents only. Externally-hosted agents (registered via a project's own HTTP endpoint) are never reachable this way -- pick their project above to target one."
          : agentName
            ? `Will send this task to agent "${agentName}" under project "${projectId}".`
            : `Will let Tricortex pick the best-matching agent by keyword, scoped to project "${projectId}"'s own registered agents only.`}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
