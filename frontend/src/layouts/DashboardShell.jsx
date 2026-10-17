import { NavLink, useNavigate } from "react-router-dom";
import { Cross, LogOut } from "lucide-react";
import Chatbot from "../components/Chatbot";
import { ToastHost } from "../components/UI";
import { logout } from "../lib/auth";
import "./DashboardShell.css";

const ROLE_LABELS = {
  donor: "Donor Portal",
  hospital: "Hospital Portal",
  admin: "Admin Portal",
};

const ROLE_USERS = {
  donor: { name: "Ananya Rao", sub: "O+ · Hyderabad" },
  hospital: { name: "Yashoda Hospital", sub: "Somajiguda" },
  admin: { name: "City Central", sub: "Blood Bank" },
};

export default function DashboardShell({ role, roleLabel, navItems, children }) {
  const navigate = useNavigate();
  const fallbackUser = ROLE_USERS[role] || ROLE_USERS.donor;
  const userName = localStorage.getItem("userName") || fallbackUser.name;
  const userSub = localStorage.getItem("userSub") || fallbackUser.sub;

  return (
    <div className="shell" data-role={role}>
      <header className="topbar">
        <div className="topbar__inner">
          <div className="topbar__brand">
            <span className="topbar__brand-mark">
              <Cross size={17} strokeWidth={2.6} />
            </span>
            <div className="topbar__brand-text">
              <div className="topbar__brand-name">RaktaSetu</div>
              <div className="topbar__brand-role">{ROLE_LABELS[role] || roleLabel}</div>
            </div>
          </div>

          <nav className="topbar__nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => "topbar__link" + (isActive ? " is-active" : "")}
              >
                {item.icon && <item.icon size={15} strokeWidth={2.2} className="topbar__link-ic" />}
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="topbar__right">
            <div
              className="topbar__user"
              style={role === "donor" ? { cursor: "pointer" } : {}}
              onClick={() => role === "donor" && navigate("/donor/profile")}
              title={role === "donor" ? "View profile" : undefined}
            >
              <div className="topbar__avatar">{userName[0]}</div>
              <div className="topbar__user-text">
                <div className="topbar__user-name">{userName}</div>
                <div className="topbar__user-sub">{userSub}</div>
              </div>
            </div>

            <button className="topbar__exit" onClick={() => logout()} title="Sign out">
              <LogOut size={15} strokeWidth={2.2} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="shell__main">{children}</main>

      <Chatbot role={role} />
      <ToastHost />
    </div>
  );
}
