import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TaskSubmitForm from "../TaskSubmitForm";

// Mock the API client module so the component is exercised against fixed fixture
// data rather than a live API service, per STEP-06's technical approach.
vi.mock("../../api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    body: string;
    constructor(status: number, body: string) {
      super(`API request failed with status ${status}: ${body}`);
      this.status = status;
      this.body = body;
    }
  },
  submitTask: vi.fn(),
}));

const mockNavigate = vi.fn();

// react-router-dom's useNavigate is mocked so we can assert on the navigation target
// without needing a full route table; other exports (e.g. MemoryRouter) pass through.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { submitTask } from "../../api/client";

describe("TaskSubmitForm", () => {
  beforeEach(() => {
    vi.mocked(submitTask).mockReset();
    mockNavigate.mockReset();
  });

  function renderForm() {
    return render(
      <MemoryRouter>
        <TaskSubmitForm />
      </MemoryRouter>,
    );
  }

  it("submits the trimmed goal and optional fields, then navigates to the new task's detail page", async () => {
    vi.mocked(submitTask).mockResolvedValue({
      task_id: "task-123",
      status: "queued",
      goal: "Summarize the quarterly report",
      agent_name: null,
      tenant_id: null,
      result: null,
      error: null,
      retry_count: 0,
      created_at: 0,
      updated_at: 0,
      control_signal: null,
      approval_id: null,
    });

    renderForm();

    fireEvent.change(screen.getByLabelText(/goal/i), {
      target: { value: "  Summarize the quarterly report  " },
    });
    fireEvent.change(screen.getByLabelText(/agent name/i), { target: { value: "chat_agent" } });
    fireEvent.change(screen.getByLabelText(/provider name/i), { target: { value: "mock" } });
    fireEvent.change(screen.getByLabelText(/tenant id/i), { target: { value: "tenant-a" } });
    fireEvent.change(screen.getByLabelText(/requester roles/i), {
      target: { value: "admin, operator" },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit task/i }));

    await waitFor(() => expect(submitTask).toHaveBeenCalledTimes(1));
    expect(submitTask).toHaveBeenCalledWith({
      goal: "Summarize the quarterly report",
      agent_name: "chat_agent",
      provider_name: "mock",
      tenant_id: "tenant-a",
      requester_roles: ["admin", "operator"],
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/tasks/task-123"));
  });

  it("shows a validation error and does not call submitTask when the goal is empty", async () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: /submit task/i }));

    expect(await screen.findByText(/goal is required/i)).toBeInTheDocument();
    expect(submitTask).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("surfaces an API error message when submission fails", async () => {
    const { ApiError } = await import("../../api/client");
    vi.mocked(submitTask).mockRejectedValue(new ApiError(500, "boom"));

    renderForm();

    fireEvent.change(screen.getByLabelText(/goal/i), { target: { value: "Do something" } });
    fireEvent.click(screen.getByRole("button", { name: /submit task/i }));

    expect(await screen.findByText(/submission failed/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
