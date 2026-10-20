import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PendingApprovalOut } from "../../api/client";
import Approvals from "../Approvals";

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
  listApprovals: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
}));

import { approve, listApprovals, reject } from "../../api/client";

const PENDING_APPROVAL: PendingApprovalOut = {
  approval_id: "appr-1",
  task_id: "task-1",
  tool_name: "delete_record",
  tool_call_id: "call-1",
  reason: "Destructive tool call requires operator sign-off",
  requested_at: 1_700_000_000,
  status: "pending",
  resolved_at: null,
};

function renderApprovals() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Approvals />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Approvals", () => {
  beforeEach(() => {
    vi.mocked(listApprovals).mockReset();
    vi.mocked(approve).mockReset();
    vi.mocked(reject).mockReset();
  });

  it("renders pending approvals with tool name, task link, and reason", async () => {
    vi.mocked(listApprovals).mockResolvedValue([PENDING_APPROVAL]);

    renderApprovals();

    const row = await screen.findByText(/delete_record/i);
    expect(row).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "task-1" })).toHaveAttribute("href", "/tasks/task-1");
    expect(screen.getByText(/destructive tool call requires operator sign-off/i)).toBeInTheDocument();
  });

  it("shows an empty state when there are no pending approvals", async () => {
    vi.mocked(listApprovals).mockResolvedValue([]);

    renderApprovals();

    expect(await screen.findByText(/no pending approvals/i)).toBeInTheDocument();
  });

  it("calls approve with the approval id and removes the row from the list on success", async () => {
    const user = userEvent.setup();
    vi.mocked(listApprovals)
      .mockResolvedValueOnce([PENDING_APPROVAL])
      .mockResolvedValueOnce([]);
    vi.mocked(approve).mockResolvedValue({ ...PENDING_APPROVAL, status: "approved" });

    renderApprovals();

    const listItem = (await screen.findByText(/delete_record/i)).closest("li") as HTMLElement;
    await user.click(within(listItem).getByRole("button", { name: /approve/i }));

    await waitFor(() => expect(approve).toHaveBeenCalledWith("appr-1"));
    await waitFor(() => expect(screen.queryByText(/delete_record/i)).not.toBeInTheDocument());
  });

  it("calls reject with the approval id and surfaces an error message when the action fails", async () => {
    const user = userEvent.setup();
    const { ApiError } = await import("../../api/client");
    vi.mocked(listApprovals).mockResolvedValue([PENDING_APPROVAL]);
    vi.mocked(reject).mockRejectedValue(new ApiError(500, "reject failed"));

    renderApprovals();

    const listItem = (await screen.findByText(/delete_record/i)).closest("li") as HTMLElement;
    await user.click(within(listItem).getByRole("button", { name: /reject/i }));

    await waitFor(() => expect(reject).toHaveBeenCalledWith("appr-1"));
    expect(await screen.findByText(/action failed/i)).toBeInTheDocument();
  });
});
