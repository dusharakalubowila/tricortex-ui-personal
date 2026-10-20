import { useQuery } from "@tanstack/react-query";

import { getGatewayCalls } from "../api/client";

// PUBLIC_INTERFACE
export default function GatewayPanel() {
  /** Read-only table of recent AI Gateway call records (`provider_name`, `duration_ms`,
   * `success`, `error`), most recent first. The API tells us explicitly whether a
   * gateway is configured at all (`configured`) -- an empty `calls` list on its own is
   * ambiguous between "no gateway" and "gateway present, nothing routed through it yet". */
  const { data, isLoading, isError } = useQuery({
    queryKey: ["gateway", "calls"],
    queryFn: () => getGatewayCalls(50),
    refetchInterval: 5000,
  });
  const calls = data?.calls ?? [];

  return (
    <div>
      <h2 className="font-medium mb-2">Gateway calls</h2>
      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && <p className="text-sm text-red-600">Failed to load gateway calls.</p>}
      {!isLoading && !isError && data && !data.configured && (
        <p className="text-sm text-gray-500">Gateway not configured — no AI Gateway is wired into this service.</p>
      )}
      {!isLoading && !isError && data?.configured && calls.length === 0 && (
        <p className="text-sm text-gray-500">Gateway configured — no provider calls routed through it yet.</p>
      )}
      {!!calls.length && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <th className="py-1 pr-4">Provider</th>
              <th className="py-1 pr-4">Duration</th>
              <th className="py-1 pr-4">Status</th>
              <th className="py-1">Error</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call, index) => (
              <tr key={`${call.provider_name}-${index}`} className="border-b border-gray-100 dark:border-gray-900">
                <td className="py-1 pr-4 font-medium">{call.provider_name}</td>
                <td className="py-1 pr-4">{call.duration_ms} ms</td>
                <td className={`py-1 pr-4 ${call.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {call.success ? "success" : "failed"}
                </td>
                <td className="py-1 text-gray-500">{call.error ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
