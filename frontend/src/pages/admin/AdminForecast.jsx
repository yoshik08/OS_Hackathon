import { useState } from "react";
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { PageHeader, Card, Badge } from "../../components/UI";
import { useApi, api } from "../../lib/api";

export default function AdminForecast() {
  const { data, error } = useApi(api.getForecast);
  const { data: inventory } = useApi(api.getInventory);
  const [group, setGroup] = useState(null);

  if (error) return <p className="empty-state">Couldn&apos;t load the forecast.</p>;
  if (!data || !inventory) return <p className="empty-state">Loading forecast…</p>;

  const { demandForecast, shortageRisk, restockRecommendations } = data;
  const groups = Object.keys(demandForecast);
  const activeGroup = group && demandForecast[group] ? group : groups[0];

  // Calculate confidence band data (predicted ± 15%)
  const chartData = demandForecast[activeGroup].map((d) => ({
    ...d,
    confidenceLow: Math.round(d.predicted * 0.85),
    confidenceHigh: Math.round(d.predicted * 1.15),
  }));

  return (
    <div>
      <PageHeader
        title="AI demand prediction"
        subtitle="Forecasted daily unit demand vs. actuals, shortage risk assessment, and restock recommendations."
        action={
          <select value={activeGroup} onChange={(e) => setGroup(e.target.value)} style={{ width: 120 }}>
            {groups.map((g) => <option key={g}>{g}</option>)}
          </select>
        }
      />

      {/* Shortage risk overview — all groups at a glance */}
      <Card title="Shortage risk by blood group">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.7rem" }}>
          {shortageRisk.map((sr) => {
            const stock = inventory.find((i) => i.bloodGroup === sr.group);
            return (
              <div
                key={sr.group}
                onClick={() => setGroup(sr.group)}
                style={{
                  padding: "0.8rem",
                  borderRadius: 8,
                  border: activeGroup === sr.group ? "2px solid var(--crimson)" : "1px solid var(--line)",
                  background: sr.risk === "Critical" ? "var(--crimson-tint)" : sr.risk === "Warning" ? "var(--amber-tint)" : "var(--green-tint)",
                  cursor: "pointer",
                  transition: "border-color 0.15s ease",
                }}
              >
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 600 }}>{sr.group}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: "0.2rem" }}>
                  {stock?.units ?? 0} units · {sr.daysOfSupply}d supply
                </div>
                <div style={{ marginTop: "0.4rem" }}>
                  <Badge>{sr.risk}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Demand forecast chart with confidence band */}
      <Card title={`${activeGroup} — 7-day demand forecast`}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--ink-soft)" }} />
            <YAxis tick={{ fontSize: 12, fill: "var(--ink-soft)" }} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.85rem" }} />
            <Legend wrapperStyle={{ fontSize: "0.82rem" }} />
            <Area type="monotone" dataKey="confidenceHigh" name="Confidence band" stroke="none" fill="var(--crimson-tint)" stackId="band" />
            <Area type="monotone" dataKey="confidenceLow" name="" stroke="none" fill="var(--paper)" stackId="band" />
            <Line type="monotone" dataKey="actual" name="Actual units used" stroke="var(--navy)" strokeWidth={2} connectNulls={false} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="predicted" name="Predicted demand" stroke="var(--crimson)" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: "0.6rem", textAlign: "center" }}>
          Shaded region shows ±15% confidence band around predictions. Sat–Sun values are forecast-only (no actuals yet).
        </div>
      </Card>

      {/* Restock recommendations */}
      <Card title="AI restock recommendations">
        {restockRecommendations.length === 0 ? (
          <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>No restock actions needed at this time.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Blood group</th>
                <th>Priority</th>
                <th>Recommended action</th>
                <th>Target units</th>
              </tr>
            </thead>
            <tbody>
              {restockRecommendations.map((r) => (
                <tr key={r.group}>
                  <td style={{ fontWeight: 600 }}>{r.group}</td>
                  <td><Badge>{r.priority}</Badge></td>
                  <td style={{ fontSize: "0.88rem" }}>{r.action}</td>
                  <td style={{ fontWeight: 600 }}>{r.targetUnits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Model note">
        <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>
          This forecast will be produced by a regression/time-series model (e.g. Prophet or
          XGBoost) trained on historical request volume, seasonality, and local event data
          once the backend is connected. The confidence band is computed as ±15% around
          the predicted value. Shortage risk is derived by comparing current stock levels
          against predicted 7-day cumulative demand.
        </p>
      </Card>
    </div>
  );
}
