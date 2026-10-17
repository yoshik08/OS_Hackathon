import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
  LineChart, Line, Legend,
} from "recharts";
import {
  Users, Package, ClipboardList, Siren, ArrowRight, CheckCheck,
  TriangleAlert, BellRing,
} from "lucide-react";
import { PageHeader, StatCard, Card, Badge } from "../../components/UI";
import { useApi, api } from "../../lib/api";
import { timeAgo } from "../../lib/utils";
import "./Admin.css";

const SAFETY_THRESHOLD = 10;

function barColor(units) {
  if (units < SAFETY_THRESHOLD) return "var(--crimson)";
  if (units < 20) return "var(--amber)";
  return "var(--navy)";
}

const chartTip = {
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: "0.85rem",
};

export default function AdminOverview() {
  const { data: adminStats, error } = useApi(api.getAdminStats);
  const { data: alerts, reload: reloadAlerts } = useApi(api.getAlerts);
  const { data: hospitalRequests } = useApi(api.getRequests);
  const { data: inventory } = useApi(api.getInventory);
  const { data: reportStats } = useApi(api.getReports);
  const [acking, setAcking] = useState(null);

  if (error) return <p className="empty-state">Couldn&apos;t load the overview.</p>;
  if (!adminStats || !alerts || !hospitalRequests || !inventory || !reportStats) {
    return <p className="empty-state">Loading overview…</p>;
  }

  const emergencyAlerts = alerts;
  const activeAlerts = emergencyAlerts;

  async function acknowledge(id) {
    setAcking(id);
    try {
      await api.resolveAlert(id);
      reloadAlerts();
    } finally {
      setAcking(null);
    }
  }

  const monthly = reportStats.monthlyCollections;

  return (
    <div>
      <PageHeader title="Blood bank overview" subtitle="City Central Blood Bank" />

      <div className="stat-grid">
        <StatCard label="Registered donors" value={adminStats.totalDonors.toLocaleString()} icon={Users} />
        <StatCard label="Units in stock" value={adminStats.totalUnitsInStock} icon={Package} tone="info" />
        <StatCard label="Pending requests" value={adminStats.pendingRequests} icon={ClipboardList} tone="warning" />
        <StatCard label="Active alerts" value={activeAlerts.length} icon={Siren} tone="critical" />
      </div>

      <div className="admin-cols">
        {/* ── Blood-group stock visualization ── */}
        <Card
          title="Blood-group stock levels"
          action={<Link to="/admin/inventory" className="card__link">Manage<ArrowRight size={14} /></Link>}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={inventory} layout="vertical" margin={{ top: 4, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: "var(--ink-soft)" }} />
              <YAxis type="category" dataKey="bloodGroup" tick={{ fontSize: 13, fontWeight: 600, fill: "var(--ink)" }} width={48} />
              <Tooltip contentStyle={chartTip} formatter={(v) => [`${v} units`, "In stock"]} />
              <ReferenceLine
                x={SAFETY_THRESHOLD}
                stroke="var(--crimson)"
                strokeDasharray="5 4"
                label={{ value: "Safety threshold", fontSize: 11, fill: "var(--crimson)", position: "top" }}
              />
              <Bar dataKey="units" name="Units in stock" radius={[0, 5, 5, 0]} barSize={20}>
                {inventory.map((r) => (
                  <Cell key={r.bloodGroup} fill={barColor(r.units)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="admin-legend">
            <span className="meta"><span className="legend-dot" style={{ background: "var(--crimson)" }} />Below {SAFETY_THRESHOLD} units</span>
            <span className="meta"><span className="legend-dot" style={{ background: "var(--amber)" }} />{SAFETY_THRESHOLD}–20 units</span>
            <span className="meta"><span className="legend-dot" style={{ background: "var(--navy)" }} />Healthy</span>
          </div>
        </Card>

        {/* ── Collection/distribution trends ── */}
        <Card
          title="Collection vs. distribution trend"
          action={<Link to="/admin/reports" className="card__link">Full reports<ArrowRight size={14} /></Link>}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthly} margin={{ top: 10, right: 20, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--ink-soft)" }} />
              <YAxis tick={{ fontSize: 12, fill: "var(--ink-soft)" }} />
              <Tooltip contentStyle={chartTip} />
              <Legend wrapperStyle={{ fontSize: "0.82rem" }} />
              <Line type="monotone" dataKey="collected" name="Collected" stroke="var(--crimson)" strokeWidth={2.6} dot={{ r: 3.5 }} />
              <Line type="monotone" dataKey="distributed" name="Distributed" stroke="var(--navy)" strokeWidth={2.6} dot={{ r: 3.5 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="admin-chart-note">
            {monthly.reduce((s, m) => s + m.collected, 0).toLocaleString()} units collected ·{" "}
            {monthly.reduce((s, m) => s + m.distributed, 0).toLocaleString()} distributed over the last 6 months
          </p>
        </Card>
      </div>

      <div className="admin-cols">
        {/* ── Alerts ── */}
        <Card
          title={`Emergency alerts (${activeAlerts.length})`}
          action={<Link to="/admin/alerts" className="card__link">All alerts<ArrowRight size={14} /></Link>}
        >
          {activeAlerts.length === 0 ? (
            <div className="empty-state">All alerts acknowledged. Nothing needs attention.</div>
          ) : (
            <div className="alert-list">
              {activeAlerts.map((a) => (
                <div key={a.id} className={`alert-row alert-row--${a.severity.toLowerCase()}`}>
                  <span className="alert-row__icon">
                    {a.severity === "Critical" ? <Siren size={19} strokeWidth={2.2} /> : <TriangleAlert size={19} strokeWidth={2.2} />}
                  </span>
                  <div className="alert-row__main">
                    <div className="alert-row__top">
                      <Badge>{a.severity}</Badge>
                      <span className="meta"><BellRing size={13} />{timeAgo(a.raisedAt)}</span>
                    </div>
                    <p className="alert-row__detail">{a.detail}</p>
                  </div>
                  <button className="btn btn--ghost" onClick={() => acknowledge(a.id)} disabled={acking === a.id}>
                    <CheckCheck size={15} strokeWidth={2.4} /> {acking === a.id ? "Saving…" : "Acknowledge"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Latest requests ── */}
        <Card
          title="Latest hospital requests"
          action={<Link to="/admin/requests" className="card__link">All requests<ArrowRight size={14} /></Link>}
        >
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Hospital</th>
                <th>Group</th>
                <th>Urgency</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {hospitalRequests.slice(0, 5).map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{r.id}</td>
                  <td>{r.hospital}</td>
                  <td style={{ fontWeight: 600 }}>{r.bloodGroup}</td>
                  <td><Badge>{r.urgency}</Badge></td>
                  <td><Badge>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
