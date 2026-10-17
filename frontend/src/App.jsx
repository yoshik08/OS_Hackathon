import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DonorDashboard from "./pages/donor/DonorDashboard";
import HospitalDashboard from "./pages/hospital/HospitalDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

// Blocks dashboard routes when there is no valid session.
function RequireAuth({ role, children }) {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("rt_user"));
  } catch {
    user = null;
  }
  const token = localStorage.getItem("rt_token");
  if (!token || !user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/home" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/donor/*"
        element={
          <RequireAuth role="donor">
            <DonorDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/hospital/*"
        element={
          <RequireAuth role="hospital">
            <HospitalDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/*"
        element={
          <RequireAuth role="admin">
            <AdminDashboard />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
