import type { LucideIcon } from "lucide-react";

// PUBLIC_INTERFACE
export default function StatCard({
  icon: Icon,
  iconClassName,
  label,
  value,
  caption,
  captionClassName,
}: {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
  caption?: string;
  captionClassName?: string;
}) {
  /** One KPI tile: icon chip, label, big value, small caption. Every field is a prop --
   * this component never fetches or fabricates data itself. */
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-4">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-3 ${iconClassName}`}>
        <Icon className="h-4.5 w-4.5" strokeWidth={2} />
      </div>
      <div className="text-sm text-slate-400">{label}</div>
      <div className="text-2xl font-semibold mt-0.5">{value}</div>
      {caption && <div className={`text-xs mt-1 ${captionClassName ?? "text-slate-500"}`}>{caption}</div>}
    </div>
  );
}
