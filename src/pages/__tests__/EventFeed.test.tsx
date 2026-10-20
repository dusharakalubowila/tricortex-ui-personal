import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AgentEventOut } from "../../api/client";
import EventFeed from "../EventFeed";

// Mock the API client module so the component is exercised against fixed fixture
// data rather than a live API service, per STEP-06's technical approach.
vi.mock("../../api/client", () => ({
  subscribeEvents: vi.fn(),
  getRecentEvents: vi.fn(),
}));

import { getRecentEvents, subscribeEvents } from "../../api/client";

const RECENT_EVENT: AgentEventOut = {
  type: "task.completed",
  agent_id: "chat_agent",
  task_id: "task-1",
  payload: {},
  ts: 1_700_000_000,
};

function renderEventFeed() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EventFeed />
    </QueryClientProvider>,
  );
}

describe("EventFeed", () => {
  beforeEach(() => {
    vi.mocked(subscribeEvents).mockReset();
    vi.mocked(getRecentEvents).mockReset();
    // No live events ever arrive in these tests: return a fake EventSource-like object
    // whose close() is a no-op, so the component's unmount cleanup does not throw.
    vi.mocked(subscribeEvents).mockImplementation(() => ({ close: vi.fn() }) as unknown as EventSource);
  });

  it("shows an empty state and a connecting indicator when no live or recent events are present", () => {
    renderEventFeed();

    expect(screen.getByText(/no events recorded yet/i)).toBeInTheDocument();
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it("renders the recent-events fallback when 'Load recent' is clicked and no live events have arrived", async () => {
    const user = userEvent.setup();
    vi.mocked(getRecentEvents).mockResolvedValue([RECENT_EVENT]);

    renderEventFeed();

    await user.click(screen.getByRole("button", { name: /load recent/i }));

    await waitFor(() => expect(getRecentEvents).toHaveBeenCalledWith({ limit: 50 }));
    expect(await screen.findByText(/task\.completed/i)).toBeInTheDocument();
    expect(screen.getByText(/chat_agent/i)).toBeInTheDocument();
    expect(screen.queryByText(/no events recorded yet/i)).not.toBeInTheDocument();
  });

  it("surfaces an error message when loading recent events fails", async () => {
    const user = userEvent.setup();
    vi.mocked(getRecentEvents).mockRejectedValue(new Error("network error"));

    renderEventFeed();

    await user.click(screen.getByRole("button", { name: /load recent/i }));

    expect(await screen.findByText(/failed to load recent events/i)).toBeInTheDocument();
  });
});
