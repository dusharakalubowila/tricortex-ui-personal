import { Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import AgentsProjects from "./pages/AgentsProjects";
import Approvals from "./pages/Approvals";
import Cost from "./pages/Cost";
import EventFeed from "./pages/EventFeed";
import Governance from "./pages/Governance";
import Overview from "./pages/Overview";
import ProjectDetail from "./pages/ProjectDetail";
import Projects from "./pages/Projects";
import TaskDetail from "./pages/TaskDetail";
import TaskList from "./pages/TaskList";

// PUBLIC_INTERFACE
export default function App() {
  /** Root route table for the Agentic Kernel console. `/` is the management-facing
   * Overview; Projects, Agents & Projects, and Cost are the other primary screens
   * (Projects is the ProjectRegistry/ProjectAgentBinding view -- "which project uses
   * which agent, with which model/tools", per KERNEL_ARCHITECTURE_REVIEW.md); Governance
   * is the engineer-facing detail view; Tasks/Approvals/Events are secondary "Advanced"
   * operations screens (per UI_REQUIREMENTS.md's information architecture). */
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/agents" element={<AgentsProjects />} />
        <Route path="/governance" element={<Governance />} />
        <Route path="/cost" element={<Cost />} />
        <Route path="/tasks" element={<TaskList />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/events" element={<EventFeed />} />
      </Route>
    </Routes>
  );
}
