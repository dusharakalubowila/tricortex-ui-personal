import type { CapabilityStatusValue } from "../api/client";

const STATUS_STYLES: Record<CapabilityStatusValue, string> = {
  allowed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  needs_approval: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  rate_limited: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  blocked: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const STATUS_LABELS: Record<CapabilityStatusValue, string> = {
  allowed: "Allowed",
  needs_approval: "Needs approval",
  rate_limited: "Rate-limited",
  blocked: "Blocked",
};

// PUBLIC_INTERFACE
export default function CapabilityBadge({ status }: { status: CapabilityStatusValue }) {
  /** Renders a resolved capability status (allowed / needs_approval / rate_limited /
   * blocked) as a colored pill badge -- the core visual language of the capability
   * matrix, per UI_REQUIREMENTS.md's plain-language-over-raw-internals principle. */
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  return <span className={`badge ${style}`}>{STATUS_LABELS[status] ?? status}</span>;
}
