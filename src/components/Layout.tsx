import {
  Bell,
  Bot,
  ClipboardCheck,
  DollarSign,
  Folder,
  LayoutDashboard,
  ListChecks,
  Radio,
  Search,
  Shield,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

// Primary screens: management-facing, plain-language visibility.
const PRIMARY_NAV_ITEMS: Array<{ to: string; label: string; end?: boolean; icon: typeof LayoutDashboard }> = [
  { to: "/", label: "Overview", end: true, icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: Folder },
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/governance", label: "Governance", icon: Shield },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/cost", label: "Cost", icon: DollarSign },
];

// Secondary/"Advanced" screens: engineer/operator tooling (human-in-the-loop approvals,
// raw event log) -- per UI_REQUIREMENTS.md §4.5, kept but demoted behind their own nav
// group rather than being the console's default landing screens.
const ADVANCED_NAV_ITEMS: Array<{ to: string; label: string; icon: typeof LayoutDashboard }> = [
  { to: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { to: "/events", label: "Events", icon: Radio },
];

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return [
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-cyan-500/10 text-cyan-300 ring-1 ring-inset ring-cyan-500/30"
      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
  ].join(" ");
}

// PUBLIC_INTERFACE
export default function Layout() {
  /** Top-level layout: a fixed sidebar (logo, primary nav, "Advanced" nav, footer tag)
   * plus a top bar (search, notifications, org identity) shared by every route, with the
   * active route's page rendered via `<Outlet />`. */
  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      <aside className="w-64 shrink-0 border-r border-slate-800/80 bg-slate-950/60 flex flex-col h-screen sticky top-0">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center font-bold text-slate-950">
            T
          </div>
          <div>
            <div className="font-semibold leading-tight tracking-tight">TRICORTEX</div>
            <div className="text-[11px] text-slate-500 leading-tight">Agentic Kernel</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClassName}>
              <item.icon className="h-4 w-4" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}

          <div className="pt-4 mt-4 border-t border-slate-800/80">
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Advanced
            </div>
            {ADVANCED_NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClassName}>
                <item.icon className="h-4 w-4" strokeWidth={2} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="p-3">
          <div className="px-1 text-[11px] text-slate-600">Tricortex Agentic Kernel</div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur px-6 py-3 flex items-center gap-4">
          <div className="flex-1 max-w-xl relative">
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              disabled
              placeholder="Search projects, agents, tasks…"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/60 pl-9 pr-14 py-2 text-sm text-slate-300 placeholder:text-slate-600 disabled:cursor-not-allowed"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-600 border border-slate-700 rounded px-1.5 py-0.5">
              ⌘K
            </span>
          </div>
          <button
            type="button"
            title="Notifications"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
          >
            <Bell className="h-4.5 w-4.5" />
          </button>
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-xs font-semibold text-slate-950">
              T
            </div>
            <div className="text-sm leading-tight">
              <div className="font-medium">Tricortex</div>
              <div className="text-[11px] text-slate-500">Console</div>
            </div>
          </div>
        </header>
        <main className="flex-1 px-6 py-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
