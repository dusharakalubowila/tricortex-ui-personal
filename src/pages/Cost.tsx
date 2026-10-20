import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ApiError,
  listAgentBudgets,
  listTenants,
  setAgentBudget,
  setTenantBudget,
  type AgentSummaryOut,
  type TenantSummaryOut,
} from "../api/client";

function budgetFraction(summary: { budget: number | null; total_tokens: number }): number | null {
  if (summary.budget == null || summary.budget <= 0) return null;
  return Math.min(1, summary.total_tokens / summary.budget);
}

function barColor(fraction: number): string {
  if (fraction >= 1) return "bg-red-500";
  if (fraction >= 0.8) return "bg-amber-500";
  return "bg-blue-500";
}

// One row: shows the bar, and an inline "Change cap" control that calls
// `PUT /cost/{tenant_id}` (CostTracker.set_budget under the hood).
function TenantRow({ tenant }: { tenant: TenantSummaryOut }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(tenant.budget ?? ""));
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (maxTokens: number) => setTenantBudget(tenant.tenant_id, maxTokens),
    onSuccess: () => {
      setEditing(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? `Failed: ${err.message}` : "Failed to save.");
    },
  });

  function handleSave() {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Enter a whole number of tokens, 0 or more.");
      return;
    }
    mutation.mutate(Math.floor(parsed));
  }

  const fraction = budgetFraction(tenant);

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="font-medium">{tenant.tenant_id}</span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {tenant.total_tokens.toLocaleString()}
          {tenant.budget != null ? ` / ${tenant.budget.toLocaleString()} tokens` : " tokens (no cap set)"}
        </span>
      </div>
      {fraction != null && (
        <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-800 overflow-hidden mt-2">
          <div className={`h-full ${barColor(fraction)}`} style={{ width: `${fraction * 100}%` }} />
        </div>
      )}
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-gray-500">
          {tenant.remaining != null
            ? tenant.remaining > 0
              ? `${tenant.remaining.toLocaleString()} remaining`
              : "Cap reached — further calls for this project are blocked"
            : "No cap set — unlimited"}
        </p>
        {!editing && (
          <button
            type="button"
            className="text-xs text-blue-600 dark:text-blue-400 underline"
            onClick={() => {
              setDraft(String(tenant.budget ?? ""));
              setEditing(true);
            }}
          >
            Change cap
          </button>
        )}
      </div>
      {editing && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="number"
            min={0}
            step={1000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={`New token cap for ${tenant.tenant_id}`}
            className="w-40 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={mutation.isPending}
            className="rounded bg-blue-600 text-white px-3 py-1 text-sm font-medium disabled:opacity-50"
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            className="text-sm text-gray-500"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function NewProjectBudgetForm() {
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState("");
  const [maxTokens, setMaxTokens] = useState("100000");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => setTenantBudget(tenantId.trim(), Math.floor(Number(maxTokens))),
    onSuccess: () => {
      setTenantId("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? `Failed: ${err.message}` : "Failed to save.");
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number(maxTokens);
    if (!tenantId.trim()) {
      setError("Project/tenant name is required.");
      return;
    }
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Enter a whole number of tokens, 0 or more.");
      return;
    }
    mutation.mutate();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 flex items-end gap-3 flex-wrap"
    >
      <div>
        <label htmlFor="newTenantId" className="block text-xs text-gray-500 mb-1">
          New project / tenant name
        </label>
        <input
          id="newTenantId"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          placeholder="e.g. vizai"
          className="w-48 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label htmlFor="newTenantBudget" className="block text-xs text-gray-500 mb-1">
          Token cap
        </label>
        <input
          id="newTenantBudget"
          type="number"
          min={0}
          step={1000}
          value={maxTokens}
          onChange={(e) => setMaxTokens(e.target.value)}
          className="w-32 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded bg-blue-600 text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {mutation.isPending ? "Adding…" : "Connect project"}
      </button>
      {error && <p className="text-xs text-red-600 w-full">{error}</p>}
    </form>
  );
}

// Agent-level counterpart to TenantRow/NewProjectBudgetForm above -- an agent budget caps
// that agent's spend across every project that uses it (PUT /agents/{agent_name}/cost),
// independent of and in addition to any per-project cap set above.
function AgentRow({ agent }: { agent: AgentSummaryOut }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(agent.budget ?? ""));
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (maxTokens: number) => setAgentBudget(agent.agent_name, maxTokens),
    onSuccess: () => {
      setEditing(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["agent-budgets"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? `Failed: ${err.message}` : "Failed to save.");
    },
  });

  function handleSave() {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Enter a whole number of tokens, 0 or more.");
      return;
    }
    mutation.mutate(Math.floor(parsed));
  }

  const fraction = budgetFraction(agent);

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="font-medium">{agent.agent_name}</span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {agent.total_tokens.toLocaleString()}
          {agent.budget != null ? ` / ${agent.budget.toLocaleString()} tokens` : " tokens (no cap set)"}
        </span>
      </div>
      {fraction != null && (
        <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-800 overflow-hidden mt-2">
          <div className={`h-full ${barColor(fraction)}`} style={{ width: `${fraction * 100}%` }} />
        </div>
      )}
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-gray-500">
          {agent.remaining != null
            ? agent.remaining > 0
              ? `${agent.remaining.toLocaleString()} remaining (across every project using this agent)`
              : "Cap reached — this agent is blocked for every project until raised"
            : "No cap set — unlimited"}
        </p>
        {!editing && (
          <button
            type="button"
            className="text-xs text-blue-600 dark:text-blue-400 underline"
            onClick={() => {
              setDraft(String(agent.budget ?? ""));
              setEditing(true);
            }}
          >
            Change cap
          </button>
        )}
      </div>
      {editing && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="number"
            min={0}
            step={1000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={`New token cap for ${agent.agent_name}`}
            className="w-40 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={mutation.isPending}
            className="rounded bg-blue-600 text-white px-3 py-1 text-sm font-medium disabled:opacity-50"
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            className="text-sm text-gray-500"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function NewAgentBudgetForm() {
  const queryClient = useQueryClient();
  const [agentName, setAgentName] = useState("");
  const [maxTokens, setMaxTokens] = useState("100000");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => setAgentBudget(agentName.trim(), Math.floor(Number(maxTokens))),
    onSuccess: () => {
      setAgentName("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["agent-budgets"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? `Failed: ${err.message}` : "Failed to save.");
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number(maxTokens);
    if (!agentName.trim()) {
      setError("Agent name is required.");
      return;
    }
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Enter a whole number of tokens, 0 or more.");
      return;
    }
    mutation.mutate();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 flex items-end gap-3 flex-wrap"
    >
      <div>
        <label htmlFor="newAgentName" className="block text-xs text-gray-500 mb-1">
          Agent name
        </label>
        <input
          id="newAgentName"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          placeholder="e.g. chat_agent"
          className="w-48 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label htmlFor="newAgentBudget" className="block text-xs text-gray-500 mb-1">
          Token cap
        </label>
        <input
          id="newAgentBudget"
          type="number"
          min={0}
          step={1000}
          value={maxTokens}
          onChange={(e) => setMaxTokens(e.target.value)}
          className="w-32 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded bg-blue-600 text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {mutation.isPending ? "Adding…" : "Set agent cap"}
      </button>
      {error && <p className="text-xs text-red-600 w-full">{error}</p>}
    </form>
  );
}

// PUBLIC_INTERFACE
export default function Cost() {
  /** Cost page: one row per project/tenant with a configured token budget, spend vs.
   * budget as a simple bar, and an inline control to set/change that cap -- per the
   * requirement that credit limits are managed centrally by the kernel, from this UI,
   * not by editing code. Per UI_REQUIREMENTS.md §4.4 -- no per-token drill-down here,
   * that's an engineer's concern already available via the raw per-tenant endpoint. */
  const { data: tenants, isLoading, isError } = useQuery({
    queryKey: ["tenants"],
    queryFn: listTenants,
    refetchInterval: 10000,
  });
  const {
    data: agentBudgets,
    isLoading: agentsLoading,
    isError: agentsError,
  } = useQuery({
    queryKey: ["agent-budgets"],
    queryFn: listAgentBudgets,
    refetchInterval: 10000,
  });

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">Cost</h1>
      <p className="text-sm text-gray-500 italic">Reflects completed calls only — not a live spend meter.</p>
      <p className="text-sm text-gray-500">
        Budgets exist on two independent levels: a <span className="font-medium">project</span> cap limits one
        project's total spend across every agent it uses; an <span className="font-medium">agent</span> cap limits
        one agent's total spend across every project that uses it. Both can be set at once — whichever is tighter
        blocks the call.
      </p>

      <div>
        <h2 className="font-medium mb-2">Project budgets</h2>
        {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
        {isError && <p className="text-sm text-red-600">Failed to load tenant cost data.</p>}
        {!isLoading && !isError && (tenants?.length ?? 0) === 0 && (
          <p className="text-sm text-gray-500">No projects have a configured budget yet.</p>
        )}
        <div className="space-y-4">
          {tenants?.map((tenant) => (
            <TenantRow key={tenant.tenant_id} tenant={tenant} />
          ))}
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Connect a new project</h3>
          <NewProjectBudgetForm />
        </div>
      </div>

      <div>
        <h2 className="font-medium mb-2">Agent budgets</h2>
        {agentsLoading && <p className="text-sm text-gray-500">Loading…</p>}
        {agentsError && <p className="text-sm text-red-600">Failed to load agent cost data.</p>}
        {!agentsLoading && !agentsError && (agentBudgets?.length ?? 0) === 0 && (
          <p className="text-sm text-gray-500">No agents have a configured budget yet.</p>
        )}
        <div className="space-y-4">
          {agentBudgets?.map((agent) => (
            <AgentRow key={agent.agent_name} agent={agent} />
          ))}
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Set an agent budget</h3>
          <NewAgentBudgetForm />
        </div>
      </div>
    </section>
  );
}
