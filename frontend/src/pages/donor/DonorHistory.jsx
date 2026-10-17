import { Droplets, CalendarDays, Award } from "lucide-react";
import { PageHeader, Card, Badge, StatCard } from "../../components/UI";
import { useApi, api } from "../../lib/api";
import "./Donor.css";

export default function DonorHistory() {
  const { data: donationHistory, error } = useApi(api.getDonorHistory);

  if (error) return <p className="empty-state">Couldn&apos;t load donation history.</p>;
  if (!donationHistory) return <p className="empty-state">Loading donation history…</p>;

  const totalUnits = donationHistory.reduce((s, d) => s + d.units, 0);
  const firstYear = donationHistory.length
    ? Math.min(...donationHistory.map((d) => new Date(d.date).getFullYear()))
    : "—";
  const sorted = [...donationHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      <PageHeader title="Donation history" subtitle="Every unit you've given, and where it went." />

      <div className="stat-grid donor-history-summary">
        <StatCard label="Total units donated" value={totalUnits} icon={Droplets} tone="critical" />
        <StatCard label="Donating since" value={firstYear} icon={CalendarDays} tone="info" />
        <StatCard label="Donor status" value="Regular" icon={Award} tone="success" />
      </div>

      <Card title={`All donations (${donationHistory.length})`}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Location</th>
              <th>Units</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr key={d.id}>
                <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                  {new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td>{d.location}</td>
                <td>{d.units}</td>
                <td><Badge>{d.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
