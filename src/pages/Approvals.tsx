import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { ApiError, approve, listApprovals, reject } from "../api/client";

// PUBLIC_INTERFACE
export default function Approvals() {
  /** Approvals queue page: lists pending approvals raised by the kernel's policy engine
   * (e.g. a `REQUIRES_APPROVAL` rule tripped by a tool call) and lets an operator
   * approve or reject each one, unblocking (or terminating) the originating task. */
  const queryClient = useQueryClient();
  const {
    data: approvals,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["approvals"],
    queryFn: listApprovals,
    refetchInterval: 2000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["approvals"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const approveMutation = useMutation({ mutationFn: (approvalId: string) => approve(approvalId), onSuccess: invalidate });
  const rejectMutation = useMutation({ mutationFn: (approvalId: string) => reject(approvalId), onSuccess: invalidate });

  const actionError = approveMutation.error ?? rejectMutation.error;

  // Only records still awaiting a decision are actionable; approved/rejected records
  // may briefly remain in the list until the next poll removes them server-side.
  const pending = approvals?.filter((approval) => approval.status === "pending") ?? [];

  return (
    <section>
      <h1 className="text-xl font-semibold mb-4">Approvals</h1>
      {isLoading && <p className="text-sm text-gray-500">Loading approvals…</p>}
      {isError && <p className="text-sm text-red-600">Failed to load approvals from the API service.</p>}
      {actionError && (
        <p className="text-sm text-red-600 mb-2">
          {actionError instanceof ApiError ? `Action failed: ${actionError.message}` : "Action failed."}
        </p>
      )}
      {!isLoading && !isError && pending.length === 0 && (
        <p className="text-sm text-gray-500">No pending approvals.</p>
      )}
      <ul className="space-y-2">
        {pending.map((approval) => {
          const isBusy =
            (approveMutation.isPending && approveMutation.variables === approval.approval_id) ||
            (rejectMutation.isPending && rejectMutation.variables === approval.approval_id);
          return (
            <li
              key={approval.approval_id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm border border-gray-200 dark:border-gray-800 rounded p-3"
            >
              <div>
                <span className="font-medium">{approval.tool_name}</span> — task{" "}
                <Link className="text-blue-600 dark:text-blue-400 hover:underline" to={`/tasks/${approval.task_id}`}>
                  {approval.task_id}
                </Link>{" "}
                — {approval.reason}
                <div className="text-xs text-gray-500 mt-0.5">
                  Requested {new Date(approval.requested_at * 1000).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => approveMutation.mutate(approval.approval_id)}
                  disabled={isBusy}
                  className="rounded border border-green-500 text-green-700 dark:text-green-400 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => rejectMutation.mutate(approval.approval_id)}
                  disabled={isBusy}
                  className="rounded border border-red-500 text-red-700 dark:text-red-400 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
