const STATUS_STYLES: Record<string, string> = {
  queued: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  running: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  awaiting_approval: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  retrying: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  dead_letter: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  // Project registration_status values (see Project.effective_status()). "active"
  // doesn't already exist above (task status uses "completed"/"running" instead), so it
  // needs its own entry here -- without it, an active project silently fell through to
  // the gray default, indistinguishable from "registered".
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  registered: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  stale: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  disabled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  // Agent effective_status values (see AgentRegistrationRecord.effective_status()) --
  // "installed" = "Installed and executable" (green, same semantics as "active"/
  // "completed" above), "not_installed" = "Registered but not installed" (blue, same
  // semantics as "registered" -- metadata exists, nothing wrong, just not runnable yet).
  installed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  not_installed: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  // Phase 3 (external-agent-governance-architecture.md): a genuinely executable
  // HTTP-adapter agent was previously indistinguishable from a truly inert one -- both
  // showed "not_installed"'s blue badge, which reads as broken for an agent that actually
  // works. Teal, deliberately distinct from both "installed" (green, native/in-process)
  // and "not_installed" (blue, genuinely not runnable) -- this agent IS runnable, just not
  // installed as trusted in-process code.
  executable_via_http: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
};

const STATUS_LABELS: Record<string, string> = {
  installed: "installed and executable",
  not_installed: "registered but not installed",
  executable_via_http: "externally hosted — executable",
};

// PUBLIC_INTERFACE
export default function StatusBadge({ status }: { status: string }) {
  /** Renders a task/approval/registration status string as a colored pill badge, using a
   * friendlier label for the few values whose raw form reads awkwardly (e.g.
   * "not_installed" -> "registered but not installed"). */
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  return <span className={`badge ${style}`}>{label}</span>;
}
