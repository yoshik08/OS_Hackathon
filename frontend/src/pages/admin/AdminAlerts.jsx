import { useState } from "react";
import { PageHeader, Card, Badge } from "../../components/UI";
import { useApi, api } from "../../lib/api";
import { timeAgo } from "../../lib/utils";

export default function AdminAlerts() {
  const { data: allAlerts, error, reload } = useApi(api.getAllAlerts);
  const [resolving, setResolving] = useState(null);
  const [confirming, setConfirming] = useState(null);

  if (error) return <p className="empty-state">Couldn&apos;t load alerts.</p>;
  if (!allAlerts) return <p className="empty-state">Loading alerts…</p>;

  const active = allAlerts.filter((a) => !a.isResolved);
  const resolved = allAlerts
    .filter((a) => a.isResolved)
    .sort((a, b) => new Date(b.resolvedAt || 0) - new Date(a.resolvedAt || 0));

  async function resolve(id) {
    setResolving(id);
    try {
      await api.resolveAlert(id);
      setConfirming(null);
      reload();
    } finally {
      setResolving(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Emergency alerts"
        subtitle="Critical stock levels and time-sensitive requests, in one feed. Resolving means you've handled it in the real world — restocked, dispatched, or called the hospital — and the alert moves to the history below."
      />

      {active.length === 0 && (
        <Card><p className="empty-state">No active alerts. All clear.</p></Card>
      )}
      {active.map((a) => (
        <Card key={a.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
            <div>
              <Badge>{a.severity}</Badge>
              <div style={{ fontWeight: 600, marginTop: "0.5rem" }}>{a.type}</div>
              <p style={{ marginTop: "0.3rem", color: "var(--ink-soft)", fontSize: "0.9rem" }}>{a.detail}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem", flexShrink: 0 }}>
              <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{timeAgo(a.raisedAt)}</span>
              {confirming === a.id ? (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    className="btn btn--ghost"
                    style={{ fontSize: "0.8rem", padding: "0.4rem 0.7rem" }}
                    onClick={() => setConfirming(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn"
                    style={{ fontSize: "0.8rem", padding: "0.4rem 0.7rem" }}
                    onClick={() => resolve(a.id)}
                    disabled={resolving === a.id}
                  >
                    {resolving === a.id ? "Resolving…" : "Confirm resolve"}
                  </button>
                </div>
              ) : (
                <button className="btn btn--ghost" onClick={() => setConfirming(a.id)}>
                  Resolve
                </button>
              )}
            </div>
          </div>
        </Card>
      ))}

      {resolved.length > 0 && (
        <Card title={`Resolved (${resolved.length})`}>
          <table>
            <thead>
              <tr>
                <th>Alert</th>
                <th>Detail</th>
                <th>Resolved</th>
              </tr>
            </thead>
            <tbody>
              {resolved.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Badge>{a.severity}</Badge>
                    <div style={{ fontWeight: 600, marginTop: "0.25rem", fontSize: "0.88rem" }}>{a.type}</div>
                  </td>
                  <td style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>{a.detail}</td>
                  <td style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                    {a.resolvedAt ? timeAgo(a.resolvedAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
