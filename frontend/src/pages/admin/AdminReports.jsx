import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { PageHeader, Card, StatCard } from "../../components/UI";
import { useApi, api } from "../../lib/api";

const PIE_COLORS = ["#a3172e", "#1e3a5f", "#92400e", "#14532d", "#6d28d9", "#0e7490", "#be185d", "#4338ca"];

export default function AdminReports() {
  const { data: reportStats, error } = useApi(api.getReports);

  if (error) return <p className="empty-state">Couldn&apos;t load reports.</p>;
  if (!reportStats) return <p className="empty-state">Loading reports…</p>;

  const totalCollected = reportStats.monthlyCollections.reduce((s, m) => s + m.collected, 0);
  const totalDistributed = reportStats.monthlyCollections.reduce((s, m) => s + m.distributed, 0);

  return (
    <div>
      <PageHeader title="Reports & analytics" subtitle="Monthly performance, distribution trends, and hospital activity." />

      <div className="stat-grid">
        <StatCard label="Units collected (6 mo)" value={totalCollected.toLocaleString()} />
        <StatCard label="Units distributed (6 mo)" value={totalDistributed.toLocaleString()} />
        <StatCard label="Expiry waste rate" value={`${reportStats.expiryWastePercent}%`} tone={reportStats.expiryWastePercent > 5 ? "critical" : "success"} />
        <StatCard label="Avg. fulfillment time" value={`${reportStats.avgFulfillmentHours}h`} />
      </div>

      <Card title="Monthly collections vs. distributions">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={reportStats.monthlyCollections} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--ink-soft)" }} />
            <YAxis tick={{ fontSize: 12, fill: "var(--ink-soft)" }} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.85rem" }} />
            <Legend wrapperStyle={{ fontSize: "0.82rem" }} />
            <Bar dataKey="collected" name="Collected" fill="var(--crimson)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="distributed" name="Distributed" fill="var(--navy)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.4rem" }}>
        <Card title="Group-wise stock distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={reportStats.groupDistribution}
                dataKey="percentage"
                nameKey="group"
                cx="50%"
                cy="50%"
                outerRadius={95}
                innerRadius={50}
                paddingAngle={2}
                label={({ group, percentage }) => `${group} ${percentage}%`}
                style={{ fontSize: "0.78rem" }}
              >
                {reportStats.groupDistribution.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.85rem" }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Top requesting hospitals">
          <table>
            <thead>
              <tr>
                <th>Hospital</th>
                <th>Requests</th>
                <th>Units fulfilled</th>
              </tr>
            </thead>
            <tbody>
              {reportStats.topRequestingHospitals.map((h) => (
                <tr key={h.name}>
                  <td style={{ fontSize: "0.88rem" }}>{h.name}</td>
                  <td>{h.requests}</td>
                  <td style={{ fontWeight: 600 }}>{h.unitsFulfilled}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
