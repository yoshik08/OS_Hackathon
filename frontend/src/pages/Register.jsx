import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Droplets, Hospital, ShieldCheck, Cross, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useApi, api } from "../lib/api";
import { BLOOD_GROUPS_FALLBACK } from "../lib/utils";
import { register } from "../lib/auth";
import "./Auth.css";

const PANEL_CONTENT = {
  donor: {
    title: "Become a\nlifesaver.",
    desc: "Register as a donor to get matched with nearby hospitals, discover donation camps, and track your impact.",
    stats: [
      { value: "1,284", label: "Donors" },
      { value: "423", label: "Lives saved" },
      { value: "5", label: "Camps/mo" },
    ]
  },
  hospital: {
    title: "Join the\nnetwork.",
    desc: "Register your hospital to raise emergency requests, search live inventory, and track fulfillments in real time.",
    stats: [
      { value: "32", label: "Hospitals" },
      { value: "97%", label: "Match rate" },
      { value: "6.4h", label: "Avg fulfillment" },
    ]
  },
  admin: {
    title: "Manage\nblood banks.",
    desc: "Register as an administrator to manage stock, schedule donation camps, and leverage AI forecasting.",
    stats: [
      { value: "8", label: "Blood groups" },
      { value: "126", label: "Units stock" },
      { value: "24/7", label: "Monitoring" },
    ]
  }
};

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState("donor");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: groupData } = useApi(api.getBloodGroups);
  const bloodGroups = groupData || BLOOD_GROUPS_FALLBACK;

  const panel = PANEL_CONTENT[role];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const formData = new FormData(e.target);
    try {
      await register({
        role,
        name: formData.get("fullName") || formData.get("hospitalName") || "User",
        email: formData.get("email"),
        password: formData.get("password"),
        bloodGroup: formData.get("bloodGroup") || undefined,
        city: formData.get("city") || undefined,
        phone: formData.get("phone") || undefined,
        dateOfBirth: formData.get("dateOfBirth") || undefined,
        hospitalName: formData.get("hospitalName") || undefined,
        location: formData.get("city") || undefined,
      });
      setSubmitted(true);
      setTimeout(() => navigate(`/login?role=${role}`), 1500);
    } catch (err) {
      setError(err.message);
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
          <h1 className="auth-panel__title" style={{ whiteSpace: "pre-line" }}>
            {panel.title}
          </h1>
          <p className="auth-panel__desc">
            {panel.desc}
          </p>
          <div className="auth-panel__stats">
            {panel.stats.map(s => (
              <div key={s.label}><strong>{s.value}</strong><span>{s.label}</span></div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel — Form ── */}
      <div className="auth-form-panel">
        <div className="auth-form-panel__top">
          <span className="auth-form-panel__label">Already registered?</span>
          <Link to="/login" className="auth-btn-link">Sign in <ArrowRight size={14} /></Link>
        </div>

        <div className="auth-form-wrapper">
          <h2 className="auth-form__title">Create Account</h2>
          <p className="auth-form__subtitle">Select your role and set up your profile.</p>

          {submitted && (
            <div className="auth-success">
              <Check size={15} strokeWidth={2.6} /> Registration successful! Redirecting to sign in…
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}
            <div className="auth-field">
              <label>Register as</label>
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

            <div className="auth-form--grid" style={{ marginTop: "0.5rem" }}>
              {/* Common Fields */}
              <div className="auth-field">
                <label>Username or email address</label>
                <input type="text" name="email" placeholder="Username or you@example.com" required />
              </div>

              <div className="auth-field">
                <label>Password</label>
                <input type="password" name="password" placeholder="Min 8 characters" required minLength={8} />
              </div>

              {/* Donor Specific Fields */}
              {role === "donor" && (
                <>
                  <div className="auth-field">
                    <label>Full name</label>
                    <input name="fullName" placeholder="e.g. Ananya Rao" required />
                  </div>
                  <div className="auth-field">
                    <label>Blood group</label>
                    <select name="bloodGroup" defaultValue="" required>
                      <option value="" disabled>Select your blood group</option>
                      {bloodGroups.map((g) => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="auth-field">
                    <label>Date of birth</label>
                    <input type="date" name="dateOfBirth" required />
                  </div>
                </>
              )}

              {/* Hospital Specific Fields */}
              {role === "hospital" && (
                <>
                  <div className="auth-field">
                    <label>Hospital name</label>
                    <input name="hospitalName" placeholder="e.g. Yashoda Hospital" required />
                  </div>
                  <div className="auth-field">
                    <label>License/Reg number</label>
                    <input placeholder="e.g. REG-19283" required />
                  </div>
                </>
              )}

              {/* Admin Specific Fields */}
              {role === "admin" && (
                <>
                  <div className="auth-field">
                    <label>Full name</label>
                    <input name="fullName" placeholder="e.g. Rahul Sharma" required />
                  </div>
                  <div className="auth-field">
                    <label>Blood bank ID</label>
                    <input placeholder="e.g. BB-CITY-01" required />
                  </div>
                </>
              )}

              {/* Shared Contact/Location Fields */}
              <div className="auth-field">
                <label>Contact number</label>
                <input type="tel" name="phone" placeholder="+91 98765 43210" required />
              </div>

              <div className="auth-field">
                <label>City</label>
                <input name="city" placeholder="e.g. Hyderabad" required />
              </div>

              {role === "donor" && (
                <div className="auth-field auth-field--full">
                  <label className="auth-checkbox">
                    <input type="checkbox" required />
                    <span>I confirm that I have no chronic illnesses, bloodborne diseases, or conditions that disqualify me from donating blood.</span>
                  </label>
                </div>
              )}
            </div>

            <button className="auth-submit" type="submit" disabled={submitted || busy} style={{ marginTop: "1rem" }}>
              {submitted ? "Creating account…" : busy ? "Creating…" : `Create ${role} account`}
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
