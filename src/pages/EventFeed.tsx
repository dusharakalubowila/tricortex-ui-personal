import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { type AgentEventOut, getRecentEvents, subscribeEvents } from "../api/client";

const MAX_LIVE_EVENTS = 200;

// PUBLIC_INTERFACE
export default function EventFeed() {
  /** Event feed page: subscribes to the live SSE stream (`GET /events/stream`) while the
   * page is mounted, and offers a "Load recent" fallback button that fetches buffered
   * events via `GET /events/recent` — covering the scope's requirement to gracefully
   * degrade when a live connection is unavailable (e.g. dropped by a proxy, or the task
   * has already finished and no further live events will arrive). */
  const [liveEvents, setLiveEvents] = useState<AgentEventOut[]>([]);
  const [connectionState, setConnectionState] = useState<"connecting" | "open" | "error">("connecting");
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const source = subscribeEvents(
      undefined,
      (event) => {
        setConnectionState("open");
        setLiveEvents((prev) => [event, ...prev].slice(0, MAX_LIVE_EVENTS));
      },
      () => setConnectionState("error"),
    );
    sourceRef.current = source;
    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, []);

  const recentQuery = useQuery({
    queryKey: ["events", "recent"],
    queryFn: () => getRecentEvents({ limit: 50 }),
    enabled: false,
  });

  const loadRecent = useCallback(() => {
    void recentQuery.refetch();
  }, [recentQuery]);

  // Prefer live events once any have arrived; otherwise show the fallback query's
  // results (if the operator has requested them) or an empty state.
  const displayEvents = liveEvents.length > 0 ? liveEvents : recentQuery.data ?? [];

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Events</h1>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-medium ${
              connectionState === "open"
                ? "text-green-600 dark:text-green-400"
                : connectionState === "error"
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-500"
            }`}
          >
            {connectionState === "open" ? "● live" : connectionState === "error" ? "● disconnected" : "● connecting…"}
          </span>
          <button
            type="button"
            onClick={loadRecent}
            className="rounded border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-medium"
          >
            Load recent
          </button>
        </div>
      </div>
      {connectionState === "error" && liveEvents.length === 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
          Live event stream is unavailable — use "Load recent" to fetch the last buffered events instead.
        </p>
      )}
      {recentQuery.isError && (
        <p className="text-sm text-red-600 mb-2">Failed to load recent events from the API service.</p>
      )}
      {displayEvents.length === 0 && (
        <p className="text-sm text-gray-500">
          {recentQuery.isFetching ? "Loading recent events…" : "No events recorded yet."}
        </p>
      )}
      <ul className="space-y-1 text-sm">
        {displayEvents.map((event, index) => (
          <li key={`${event.ts}-${index}`} className="border-b border-gray-100 dark:border-gray-900 py-1">
            <span className="font-mono text-xs text-gray-500">{new Date(event.ts * 1000).toLocaleTimeString()}</span>{" "}
            <span className="font-medium">{event.type}</span> — {event.agent_id}
            {event.task_id && <span className="text-gray-500"> (task {event.task_id})</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
