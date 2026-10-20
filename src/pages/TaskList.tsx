import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { listTasks } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import TaskSubmitForm from "./TaskSubmitForm";

// PUBLIC_INTERFACE
export default function TaskList() {
  /** Task list page: renders the task submission form followed by a live-polled table of
   * submitted tasks (`GET /tasks`), each linking to its detail page. */
  const { data: tasks, isLoading, isError } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => listTasks({ limit: 100 }),
    refetchInterval: 2000,
  });

  return (
    <section>
      <h1 className="text-xl font-semibold mb-4">Tasks</h1>
      <TaskSubmitForm />
      {isLoading && <p className="text-sm text-gray-500">Loading tasks…</p>}
      {isError && <p className="text-sm text-red-600">Failed to load tasks from the API service.</p>}
      {!isLoading && !isError && (tasks?.length ?? 0) === 0 && (
        <p className="text-sm text-gray-500">No tasks submitted yet.</p>
      )}
      {!!tasks?.length && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-200 dark:border-gray-800">
              <th className="py-2 pr-4">Task ID</th>
              <th className="py-2 pr-4">Goal</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.task_id} className="border-b border-gray-100 dark:border-gray-900">
                <td className="py-2 pr-4">
                  <Link className="text-blue-600 dark:text-blue-400 hover:underline" to={`/tasks/${task.task_id}`}>
                    {task.task_id}
                  </Link>
                </td>
                <td className="py-2 pr-4">{task.goal}</td>
                <td className="py-2 pr-4">
                  <StatusBadge status={task.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
