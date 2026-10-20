import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError, submitTask } from "../api/client";

// PUBLIC_INTERFACE
export default function TaskSubmitForm() {
  /** Task submission form: collects a `TaskRequest` (required `goal`, plus optional
   * `agent_name`, `provider_name`, `tenant_id`, `requester_roles`), posts it via
   * `submitTask`, and navigates to the new task's detail page on success. */
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");
  const [agentName, setAgentName] = useState("");
  const [providerName, setProviderName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [requesterRoles, setRequesterRoles] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        agent_name: agentName.trim() || undefined,
        provider_name: providerName.trim() || undefined,
        tenant_id: tenantId.trim() || undefined,
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
          <label htmlFor="agentName" className="block text-sm font-medium mb-1">
            Agent name (optional)
          </label>
          <input
            id="agentName"
            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
          />
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
          <label htmlFor="tenantId" className="block text-sm font-medium mb-1">
            Tenant ID (optional)
          </label>
          <input
            id="tenantId"
            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
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
