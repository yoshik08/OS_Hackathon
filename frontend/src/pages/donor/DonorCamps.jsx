import { MapPin, CalendarDays, Clock } from "lucide-react";
import { PageHeader, Card } from "../../components/UI";
import { useApi, api } from "../../lib/api";

export default function DonorCamps() {
  const { data: donationCamps, error } = useApi(api.getCamps);

  if (error) return <p className="empty-state">Couldn&apos;t load camps.</p>;
  if (!donationCamps) return <p className="empty-state">Loading camps…</p>;

  const upcoming = donationCamps.filter((c) => c.status === "Upcoming");
  const past = donationCamps.filter((c) => c.status === "Completed");

  return (
    <div>
      <PageHeader title="Donation camps near you" subtitle="Register for an upcoming camp or view past events." />

      <Card title={`Upcoming camps (${upcoming.length})`}>
        {upcoming.length === 0 ? (
          <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>No upcoming camps found.</p>
        ) : (
          upcoming.map((c) => (
            <div key={c.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              padding: "0.8rem 0", borderBottom: "1px solid var(--line)"
            }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>{c.name}</div>
                <div style={{ fontSize: "0.86rem", color: "var(--ink-soft)", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <span className="meta"><MapPin size={14} /> {c.location}</span>
                  <span className="meta"><CalendarDays size={14} /> {c.date}</span>
                  <span className="meta"><Clock size={14} /> {c.time}</span>
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: "0.25rem" }}>
                  Organized by {c.organizer}
                </div>
              </div>
              <button className="btn btn--ghost" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>Register interest</button>
            </div>
          ))
        )}
      </Card>

      <Card title={`Past camps (${past.length})`}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Date</th>
              <th>Organizer</th>
              <th>Units collected</th>
            </tr>
          </thead>
          <tbody>
            {past.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td style={{ fontSize: "0.85rem" }}>{c.location}</td>
                <td>{c.date}</td>
                <td style={{ fontSize: "0.85rem" }}>{c.organizer}</td>
                <td style={{ fontWeight: 600 }}>{c.unitsCollected} units</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
