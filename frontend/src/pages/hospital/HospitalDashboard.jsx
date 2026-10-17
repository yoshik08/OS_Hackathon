import { Routes, Route } from "react-router-dom";
import { LayoutDashboard, CirclePlus, ClipboardList, Search } from "lucide-react";
import DashboardShell from "../../layouts/DashboardShell";
import HospitalOverview from "./HospitalOverview";
import RaiseRequest from "./RaiseRequest";
import MyRequests from "./MyRequests";
import InventorySearch from "./InventorySearch";
import RequestDetail from "./RequestDetail";

const navItems = [
  { to: "/hospital", label: "Overview", end: true, icon: LayoutDashboard },
  { to: "/hospital/request", label: "Raise request", icon: CirclePlus },
  { to: "/hospital/requests", label: "My requests", icon: ClipboardList },
  { to: "/hospital/inventory", label: "Inventory search", icon: Search },
];

export default function HospitalDashboard() {
  return (
    <DashboardShell role="hospital" roleLabel="Hospital dashboard" navItems={navItems}>
      <Routes>
        <Route index element={<HospitalOverview />} />
        <Route path="request" element={<RaiseRequest />} />
        <Route path="requests" element={<MyRequests />} />
        <Route path="requests/:reqId" element={<RequestDetail />} />
        <Route path="inventory" element={<InventorySearch />} />
      </Routes>
    </DashboardShell>
  );
}
