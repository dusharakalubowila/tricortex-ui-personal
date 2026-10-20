import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, addPolicy, getGovernanceReport, getGuardrails, getPolicy, removePolicy } from "../api/client";
import GatewayPanel from "../components/GatewayPanel";

const POLICY_RULES = ["denied", "allowed", "requires_approval", "max_calls_per_window"] as const;

// PUBLIC_INTERFACE
export default function Governance() {
  /** Governance detail page: the raw policy rules, guardrail config, AI Gateway call
   * log, and the full Markdown compliance report -- the "for engineers" detail behind
   * Overview's plain-language health banner and Agents & Projects' capability matrix
   * (per UI_REQUIREMENTS.md §4.3's "Advanced toggle" -- surfaced here as its own page
   * rather than an in-page toggle, since this content is inherently technical either
   * way). Cost/tenant visibility and per-agent capability status live on their own
   * pages now (`/cost`, `/agents`) rather than duplicated here. */
  const queryClient = useQueryClient();
  const policyQuery = useQuery({ queryKey: ["policy"], queryFn: getPolicy });
  const guardrailsQuery = useQuery({ queryKey: ["guardrails"], queryFn: getGuardrails });
  const reportQuery = useQuery({ queryKey: ["governance", "report"], queryFn: getGovernanceReport });

  const removeMutation = useMutation({
    mutationFn: (index: number) => removePolicy(index),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["policy"] }),
  });

  return (
    <section className="space-y-8">
      <h1 className="text-xl font-semibold">Governance (detail)</h1>
      <p className="text-sm text-gray-500">
        Raw policy rules and guardrail configuration. For a plain-language summary, see{" "}
        <Link to="/" className="underline">
          Overview
        </Link>{" "}
        or the capability matrix on{" "}
        <Link to="/agents" className="underline">
          Agents &amp; Projects
        </Link>
        .
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3">
        <span className="font-medium text-gray-900 dark:text-gray-100">What "governance" means here: </span>
        can you show that your AI agents are controlled, not just trusted to behave. It's
        three things — <span className="font-medium">Policies</span> (the rulebook: who can
        do what, what needs a human's approval, what's blocked outright),{" "}
        <span className="font-medium">Guardrails</span> (automatic checks on every request/
        response, e.g. catching leaked secrets or personal info), and the{" "}
        <span className="font-medium">Compliance report</span> (a snapshot of how governed
        the system currently is, and what gaps exist).
      </p>

      <div>
        <h2 className="font-medium mb-2">Policies</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          The actual rulebook. Each row says: for this <span className="font-medium">subject</span> (who —
          everyone <code>*</code>, one agent, a role like <code>role:admin</code>, or a
          project like <code>tenant:vizai</code>), doing this{" "}
          <span className="font-medium">tool pattern</span> (which action, e.g.{" "}
          <code>delete_*</code> matches anything starting with "delete"), the outcome is
          the <span className="font-medium">rule</span> — allowed outright, blocked
          outright, needs a human's approval first, or rate-limited — with the{" "}
          <span className="font-medium">reason</span> shown to anyone who asks why.
        </p>
        {policyQuery.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
        {policyQuery.isError && <p className="text-sm text-red-600">Failed to load policies.</p>}
        {policyQuery.data && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Default decision when no policy matches:{" "}
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {policyQuery.data.default_deny ? "deny" : "allow (no approval needed)"}
              </span>{" "}
              — what happens when a tool call doesn't match any rule below. "Allow" means it
              just runs; "deny" means nothing runs unless a rule explicitly allows it (the
              safer default for production).
            </p>
            {policyQuery.data.policies.length === 0 ? (
              <p className="text-sm text-gray-500">No explicit policies configured.</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                    <th className="py-1 pr-4">Subject</th>
                    <th className="py-1 pr-4">Tool pattern</th>
                    <th className="py-1 pr-4">Rule</th>
                    <th className="py-1 pr-4">Reason</th>
                    <th className="py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {policyQuery.data.policies.map((policy, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-900">
                      <td className="py-1 pr-4">{policy.subject}</td>
                      <td className="py-1 pr-4 font-mono text-xs">{policy.tool_pattern}</td>
                      <td className="py-1 pr-4 font-medium">{policy.rule}</td>
                      <td className="py-1 pr-4 text-gray-600 dark:text-gray-400">{policy.reason}</td>
                      <td className="py-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeMutation.mutate(index)}
                          disabled={removeMutation.isPending}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {removeMutation.isError && (
              <p className="text-sm text-red-600">
                {removeMutation.error instanceof ApiError ? `Failed: ${removeMutation.error.message}` : "Failed to remove policy."}
              </p>
            )}
          </div>
        )}
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Add a policy</h3>
          <AddPolicyForm />
        </div>
      </div>

      <div>
        <h2 className="font-medium mb-2">Guardrails</h2>
        {guardrailsQuery.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
        {guardrailsQuery.isError && <p className="text-sm text-red-600">Failed to load guardrails.</p>}
        {guardrailsQuery.data && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Input: {guardrailsQuery.data.input.join(", ") || "none"} · Output:{" "}
            {guardrailsQuery.data.output.join(", ") || "none"}
            <span className="block text-xs text-gray-500 italic mt-1">
              Heuristic (regex/keyword-based), not ML — a first line of defense, not a guarantee.
            </span>
          </p>
        )}
      </div>

      <GatewayPanel />

      <div>
        <h2 className="font-medium mb-2">Compliance report (Markdown)</h2>
        {reportQuery.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
        {reportQuery.isError && <p className="text-sm text-red-600">Failed to load the compliance report.</p>}
        {reportQuery.data && (
          <pre className="text-xs bg-gray-100 dark:bg-gray-900 rounded p-3 overflow-auto whitespace-pre-wrap">
            {reportQuery.data}
          </pre>
        )}
      </div>
    </section>
  );
}

function AddPolicyForm() {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("*");
  const [toolPattern, setToolPattern] = useState("");
  const [rule, setRule] = useState<(typeof POLICY_RULES)[number]>("denied");
  const [maxCalls, setMaxCalls] = useState("5");
  const [windowSeconds, setWindowSeconds] = useState("60");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      addPolicy({
        subject: subject.trim(),
        tool_pattern: toolPattern.trim(),
        rule,
        max_calls: rule === "max_calls_per_window" ? Number(maxCalls) : undefined,
        window_seconds: rule === "max_calls_per_window" ? Number(windowSeconds) : undefined,
        reason: reason.trim(),
      }),
    onSuccess: () => {
      setToolPattern("");
      setReason("");
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["policy"] });
    },
    onError: (err) => setFormError(err instanceof ApiError ? `Failed: ${err.message}` : "Failed to add policy."),
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subject.trim() || !toolPattern.trim()) {
      setFormError("Subject and tool pattern are required.");
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
        <label htmlFor="policySubject" className="block text-xs text-gray-500 mb-1">
          Subject
        </label>
        <input
          id="policySubject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder='"*", an agent name, "role:x", "tenant:x"'
          className="w-52 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label htmlFor="policyToolPattern" className="block text-xs text-gray-500 mb-1">
          Tool pattern
        </label>
        <input
          id="policyToolPattern"
          value={toolPattern}
          onChange={(e) => setToolPattern(e.target.value)}
          placeholder="e.g. delete_*"
          className="w-40 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm font-mono"
        />
      </div>
      <div>
        <label htmlFor="policyRule" className="block text-xs text-gray-500 mb-1">
          Rule
        </label>
        <select
          id="policyRule"
          value={rule}
          onChange={(e) => setRule(e.target.value as (typeof POLICY_RULES)[number])}
          // `bg-transparent` alone leaves this readable when closed (it shows the page's
          // own background through it) but the browser renders the *open* dropdown list
          // natively, ignoring the page's dark styling -- without an explicit background/
          // text color and a `color-scheme` hint, that popup can render pale text on a
          // pale background, invisible except on hover (where the highlight color happens
          // to contrast). Explicit colors + colorScheme fix it in both light and dark.
          style={{ colorScheme: "dark" }}
          className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm"
        >
          {POLICY_RULES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      {rule === "max_calls_per_window" && (
        <>
          <div>
            <label htmlFor="policyMaxCalls" className="block text-xs text-gray-500 mb-1">
              Max calls
            </label>
            <input
              id="policyMaxCalls"
              type="number"
              min={1}
              value={maxCalls}
              onChange={(e) => setMaxCalls(e.target.value)}
              className="w-20 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label htmlFor="policyWindowSeconds" className="block text-xs text-gray-500 mb-1">
              Window (s)
            </label>
            <input
              id="policyWindowSeconds"
              type="number"
              min={1}
              value={windowSeconds}
              onChange={(e) => setWindowSeconds(e.target.value)}
              className="w-24 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
            />
          </div>
        </>
      )}
      <div>
        <label htmlFor="policyReason" className="block text-xs text-gray-500 mb-1">
          Reason (optional)
        </label>
        <input
          id="policyReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-56 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded bg-blue-600 text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {mutation.isPending ? "Adding…" : "Add policy"}
      </button>
      {formError && <p className="text-xs text-red-600 w-full">{formError}</p>}
      <p className="text-xs text-gray-500 w-full">
        Takes effect immediately for the live engine, but is not persisted across an API restart.
      </p>
    </form>
  );
}
