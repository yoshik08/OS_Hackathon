import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Droplets, Hospital, ShieldCheck, Cross, ArrowRight, ArrowLeft } from "lucide-react";
import { login } from "../lib/auth";
import "./Auth.css";

const VALID_ROLES = ["donor", "hospital", "admin"];

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get("role");
  const [role, setRole] = useState(VALID_ROLES.includes(requestedRole) ? requestedRole : "donor");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const idField = {
    donor: { label: "Username or email address", placeholder: "Username or you@example.com" },
    hospital: { label: "Hospital ID", placeholder: "e.g. HSP-1024" },
    admin: { label: "Username or email address", placeholder: "Username or you@example.com" },
  }[role];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const formData = new FormData(e.target);
    try {
      const user = await login({
        identifier: formData.get("username"),
        password: formData.get("password"),
        role,
      });
      navigate(`/${user.role}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-split">
      {/* ── Left Panel — Branding ── */}
      <div className="auth-panel">
        <div className="auth-panel__bg">
          <div className="auth-panel__orb auth-panel__orb--1" />
          <div className="auth-panel__orb auth-panel__orb--2" />
          <div className="auth-panel__pulse-ring" />
        </div>
        <div className="auth-panel__content">
          <Link to="/home" className="auth-panel__brand">
            <span className="auth-panel__mark">
              <Cross size={16} strokeWidth={2.6} />
            </span>
            <span>RaktaSetu</span>
          </Link>
          <h1 className="auth-panel__title">
            Every drop<br />counts.
          </h1>
          <p className="auth-panel__desc">
            Join the network that connects donors, hospitals, and blood banks — saving lives through smart matching and real-time inventory.
          </p>
          <div className="auth-panel__stats">
            <div><strong>1,284</strong><span>Donors</span></div>
            <div><strong>126</strong><span>Units</span></div>
            <div><strong>97%</strong><span>Match rate</span></div>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Form ── */}
      <div className="auth-form-panel">
        <div className="auth-form-panel__top">
          <span className="auth-form-panel__label">Don't have an account?</span>
          <Link to="/register" className="auth-btn-link">Register <ArrowRight size={14} /></Link>
        </div>

        <div className="auth-form-wrapper">
          <h2 className="auth-form__title">Welcome back</h2>
          <p className="auth-form__subtitle">Sign in to your account to continue.</p>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}
            <div className="auth-field">
              <label>{idField.label}</label>
              <input type="text" name="username" placeholder={idField.placeholder} required />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input type="password" name="password" placeholder="••••••••" required />
            </div>

            <div className="auth-field">
              <label>Login as</label>
              <div className="auth-role-tabs">
                {[
                  { value: "donor", label: "Donor", icon: Droplets },
                  { value: "hospital", label: "Hospital", icon: Hospital },
                  { value: "admin", label: "Admin", icon: ShieldCheck },
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    className={"auth-role-tab" + (role === r.value ? " auth-role-tab--active" : "")}
                    onClick={() => setRole(r.value)}
                  >
                    <span className="auth-role-tab__icon"><r.icon size={16} strokeWidth={2.2} /></span>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="auth-form__footer">
            <Link to="/home"><ArrowLeft size={14} /> Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
