import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, createProject, listProjects } from "../api/client";
import StatusBadge from "../components/StatusBadge";

// PUBLIC_INTERFACE
export default function Projects() {
  /** Projects page: one card per registered project (name, description, how many agents
   * it has bound, current spend) -- the "Project" side of "Project + Agent Definition +
   * ProjectAgentBinding" (see KERNEL_ARCHITECTURE_REVIEW.md). Distinct from the
   * project/tenant grouping shown on Overview and Agents & Projects, which is inferred
   * from `AgentSpec.project` (a cosmetic label) -- this page reflects the kernel's actual
   * `ProjectRegistry` + resolved `ProjectAgentBinding` count for each project. */
  const { data: projectsList, isLoading, isError } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
    refetchInterval: 10000,
  });

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">Projects</h1>
      <p className="text-sm text-gray-500">
        Each project below can bind any registered agent (see{" "}
        <Link to="/agents" className="underline">
          Agents &amp; Projects
        </Link>
        ) with its own model, tools, and runtime context, without duplicating the agent itself.
      </p>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && <p className="text-sm text-red-600">Failed to load projects.</p>}
      {!isLoading && !isError && (projectsList?.length ?? 0) === 0 && (
        <p className="text-sm text-gray-500">No projects registered yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {projectsList?.map((project) => (
          <Link
            key={project.project_id}
            to={`/projects/${encodeURIComponent(project.project_id)}`}
            className="border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{project.name}</span>
              <StatusBadge status={project.registration_status} />
            </div>
            {project.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{project.description}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              {project.agent_count} agent{project.agent_count === 1 ? "" : "s"} bound
              {project.budget != null && (
                <> · {project.total_tokens.toLocaleString()} / {project.budget.toLocaleString()} tokens</>
              )}
            </p>
            {(project.environment || project.package_version) && (
              <p className="text-xs text-gray-500 mt-1">
                {project.environment && <>{project.environment}</>}
                {project.environment && project.package_version && " · "}
                {project.package_version && <>v{project.package_version}</>}
                {project.last_heartbeat_at != null && (
                  <> · last heartbeat {new Date(project.last_heartbeat_at * 1000).toLocaleTimeString()}</>
                )}
              </p>
            )}
          </Link>
        ))}
      </div>

      <div>
        <h2 className="font-medium mb-2">Register a new project</h2>
        <NewProjectForm />
      </div>
    </section>
  );
}

function NewProjectForm() {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createProject({ project_id: projectId.trim(), name: name.trim(), description: description.trim() }),
    onSuccess: () => {
      setProjectId("");
      setName("");
      setDescription("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? `Failed: ${err.message}` : "Failed to save.");
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId.trim() || !name.trim()) {
      setError("Project id and name are required.");
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
        <label htmlFor="projectId" className="block text-xs text-gray-500 mb-1">
          Project id
        </label>
        <input
          id="projectId"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="e.g. vizai"
          className="w-40 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label htmlFor="projectName" className="block text-xs text-gray-500 mb-1">
          Display name
        </label>
        <input
          id="projectName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. VizAI"
          className="w-48 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label htmlFor="projectDescription" className="block text-xs text-gray-500 mb-1">
          Description (optional)
        </label>
        <input
          id="projectDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-64 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded bg-blue-600 text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {mutation.isPending ? "Adding…" : "Register project"}
      </button>
      {error && <p className="text-xs text-red-600 w-full">{error}</p>}
    </form>
  );
}
