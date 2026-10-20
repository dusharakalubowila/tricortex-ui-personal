import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { ApiError, cancelTask, getTask, pauseTask, resumeTask } from "../api/client";
import StatusBadge from "../components/StatusBadge";

/** States from which a pause request is meaningful (cooperative — takes effect at the
 * next tool-call boundary in the kernel's runtime daemon, per DEC-01). */
const PAUSABLE_STATUSES = new Set(["queued", "running"]);
/** States from which a resume request is meaningful. */
const RESUMABLE_STATUSES = new Set(["paused", "awaiting_approval"]);
/** Terminal states from which no lifecycle action applies. */
const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled", "dead_letter"]);

// PUBLIC_INTERFACE
export default function TaskDetail() {
  /** Task detail page: shows the full task record for the `:id` route param, plus
   * pause/resume/cancel lifecycle controls. Per DEC-01, lifecycle transitions here are
   * cooperative rather than instantaneous — the UI labels `PAUSED` and a "cancel
   * requested" sub-state (task still `running` with `control_signal == "cancel"`)
   * distinctly from a terminal `CANCELLED` state, and never implies an immediate stop. */
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const {
    data: task,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["task", id],
    queryFn: () => getTask(id as string),
    enabled: !!id,
    refetchInterval: 1500,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const pauseMutation = useMutation({ mutationFn: () => pauseTask(id as string), onSuccess: invalidate });
  const resumeMutation = useMutation({ mutationFn: () => resumeTask(id as string), onSuccess: invalidate });
  const cancelMutation = useMutation({ mutationFn: () => cancelTask(id as string), onSuccess: invalidate });

  const actionError = pauseMutation.error ?? resumeMutation.error ?? cancelMutation.error;
  const actionInFlight = pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending;

  if (isLoading) return <p className="text-sm text-gray-500">Loading task…</p>;
  if (isError || !task) return <p className="text-sm text-red-600">Task not found.</p>;

  // A cancel request has been sent cooperatively but the task has not yet reached the
  // terminal `cancelled` status — it will stop at its next tool-call boundary.
  const cancelRequested = task.control_signal === "cancel" && task.status !== "cancelled";
  const canPause = PAUSABLE_STATUSES.has(task.status) && !cancelRequested;
  const canResume = RESUMABLE_STATUSES.has(task.status);
  const canCancel = !TERMINAL_STATUSES.has(task.status) && !cancelRequested;

  return (
    <section className="space-y-4">
      <Link to="/tasks" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
        ← Back to tasks
      </Link>
      <h1 className="text-xl font-semibold">Task {task.task_id}</h1>
      <div className="flex items-center gap-2">
        <StatusBadge status={task.status} />
        {cancelRequested && (
          <span className="badge bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
            cancel requested
          </span>
        )}
      </div>
      {task.status === "paused" && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          This task is paused cooperatively — it stopped at its most recent tool-call boundary and will remain
          idle until resumed.
        </p>
      )}
      {cancelRequested && (
        <p className="text-sm text-orange-700 dark:text-orange-400">
          Cancellation has been requested but has not yet taken effect — the task will stop at its next tool-call
          boundary, not instantaneously.
        </p>
      )}
      <p className="text-sm">
        <span className="font-medium">Goal:</span> {task.goal}
      </p>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
        <div>
          <dt className="font-medium text-gray-900 dark:text-gray-100">Retry count</dt>
          <dd>{task.retry_count}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-900 dark:text-gray-100">Created</dt>
          <dd>{new Date(task.created_at * 1000).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-900 dark:text-gray-100">Updated</dt>
          <dd>{new Date(task.updated_at * 1000).toLocaleString()}</dd>
        </div>
        {task.approval_id && (
          <div>
            <dt className="font-medium text-gray-900 dark:text-gray-100">Pending approval</dt>
            <dd>
              <Link className="text-blue-600 dark:text-blue-400 hover:underline" to="/approvals">
                {task.approval_id}
              </Link>
            </dd>
          </div>
        )}
      </dl>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => pauseMutation.mutate()}
          disabled={!canPause || actionInFlight}
          className="rounded border border-amber-500 text-amber-700 dark:text-amber-400 px-3 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          Pause
        </button>
        <button
          type="button"
          onClick={() => resumeMutation.mutate()}
          disabled={!canResume || actionInFlight}
          className="rounded border border-blue-500 text-blue-700 dark:text-blue-400 px-3 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          Resume
        </button>
        <button
          type="button"
          onClick={() => cancelMutation.mutate()}
          disabled={!canCancel || actionInFlight}
          className="rounded border border-red-500 text-red-700 dark:text-red-400 px-3 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
      {actionError && (
        <p className="text-sm text-red-600">
          {actionError instanceof ApiError ? `Action failed: ${actionError.message}` : "Action failed."}
        </p>
      )}

      {task.result != null && (
        <div>
          <h2 className="text-sm font-medium mb-1">Result</h2>
          <pre className="text-xs bg-gray-100 dark:bg-gray-900 rounded p-3 overflow-auto">
            {JSON.stringify(task.result, null, 2)}
          </pre>
        </div>
      )}
      {task.error && (
        <div>
          <h2 className="text-sm font-medium mb-1">Error</h2>
          <p className="text-sm text-red-600">{task.error}</p>
        </div>
      )}
    </section>
  );
}
