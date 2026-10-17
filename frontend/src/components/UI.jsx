import { useEffect, useState } from "react";
import "./UI.css";

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, tone, icon: Icon }) {
  return (
    <div className={"stat-card" + (tone ? ` stat-card--${tone}` : "")}>
      {Icon && (
        <div className="stat-card__icon">
          <Icon size={17} strokeWidth={2.2} />
        </div>
      )}
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}

const TONE_MAP = {
  Critical: "critical",
  Urgent: "warning",
  Warning: "warning",
  Routine: "neutral",
  Pending: "neutral",
  Matching: "warning",
  Matched: "info",
  Fulfilled: "success",
  Completed: "success",
};

export function Badge({ children }) {
  const tone = TONE_MAP[children] || "neutral";
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function Card({ title, action, children, className }) {
  return (
    <section className={"card" + (className ? ` ${className}` : "")}>
      {(title || action) && (
        <div className="card__head">
          {title && <h3>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

// ── Toasts ────────────────────────────────────────────────────────────────
// toast("Donor notified") from anywhere; <ToastHost/> renders them once
// (mounted in DashboardShell). Auto-dismisses after 4 seconds.
const toastListeners = new Set();
let toastSeq = 0;

export function toast(message, sub) {
  const item = { id: ++toastSeq, message, sub };
  toastListeners.forEach((fn) => fn(item));
}

export function ToastHost() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const push = (item) => {
      setItems((list) => [...list, item]);
      setTimeout(() => {
        setItems((list) => list.filter((t) => t.id !== item.id));
      }, 4000);
    };
    toastListeners.add(push);
    return () => {
      toastListeners.delete(push);
    };
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast">
          <div className="toast__msg">{t.message}</div>
          {t.sub && <div className="toast__sub">{t.sub}</div>}
        </div>
      ))}
    </div>
  );
}
