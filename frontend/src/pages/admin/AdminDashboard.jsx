import { Routes, Route } from "react-router-dom";
import {
  LayoutDashboard, Database, ClipboardList, Siren, HeartHandshake,
  FlaskConical, Tent, BrainCircuit, ChartColumn,
} from "lucide-react";
import DashboardShell from "../../layouts/DashboardShell";
import AdminOverview from "./AdminOverview";
import AdminInventory from "./AdminInventory";
import AdminRequests from "./AdminRequests";
import AdminAlerts from "./AdminAlerts";
import AdminMatching from "./AdminMatching";
import AdminForecast from "./AdminForecast";
import AdminCrossMatch from "./AdminCrossMatch";
import AdminCamps from "./AdminCamps";
import AdminReports from "./AdminReports";

const navItems = [
  { to: "/admin", label: "Overview", end: true, icon: LayoutDashboard },
  { to: "/admin/inventory", label: "Inventory", icon: Database },
  { to: "/admin/requests", label: "Requests", icon: ClipboardList },
  { to: "/admin/alerts", label: "Emergency alerts", icon: Siren },
  { to: "/admin/matching", label: "Donor matching", icon: HeartHandshake },
  { to: "/admin/crossmatch", label: "Cross-match records", icon: FlaskConical },
  { to: "/admin/camps", label: "Camp management", icon: Tent },
  { to: "/admin/forecast", label: "AI demand prediction", icon: BrainCircuit },
  { to: "/admin/reports", label: "Reports & analytics", icon: ChartColumn },
];

export default function AdminDashboard() {
  return (
    <DashboardShell role="admin" roleLabel="Admin dashboard" navItems={navItems}>
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="requests" element={<AdminRequests />} />
        <Route path="alerts" element={<AdminAlerts />} />
        <Route path="matching" element={<AdminMatching />} />
        <Route path="crossmatch" element={<AdminCrossMatch />} />
        <Route path="camps" element={<AdminCamps />} />
        <Route path="forecast" element={<AdminForecast />} />
        <Route path="reports" element={<AdminReports />} />
      </Routes>
    </DashboardShell>
  );
}
