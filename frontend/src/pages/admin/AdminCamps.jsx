import { useState } from "react";
import { PageHeader, Card, Badge } from "../../components/UI";
import { useApi, api } from "../../lib/api";

export default function AdminCamps() {
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: donationCamps, error, reload } = useApi(api.getCamps);

  if (error) return <p className="empty-state">Couldn&apos;t load camps.</p>;
  if (!donationCamps) return <p className="empty-state">Loading camps…</p>;

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    const fd = new FormData(e.target);
    try {
      await api.createCamp({
        name: fd.get("name"),
        organizer: fd.get("organizer"),
        location: fd.get("location"),
        date: fd.get("campDate"),
        time: fd.get("timeSlot") || undefined,
        expectedDonors: fd.get("expectedDonors") ? Number(fd.get("expectedDonors")) : undefined,
        contactPhone: fd.get("contactPhone") || undefined,
      });
      setShowForm(false);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const upcoming = donationCamps.filter((c) => c.status === "Upcoming");
  const completed = donationCamps.filter((c) => c.status === "Completed");

  return (
    <div>
      <PageHeader
        title="Camp management"
        subtitle="Schedule and track blood donation camps across the city."
        action={
          <button className="btn" onClick={() => { setShowForm(!showForm); setFormError(""); }}>
            {showForm ? "Cancel" : "+ Schedule new camp"}
          </button>
        }
      />

      {showForm && (
        <Card title="Schedule a new camp">
          {formError && (
            <div style={{ background: "var(--crimson-tint)", color: "var(--crimson-deep)", padding: "0.7rem 1rem", borderRadius: 6, fontSize: "0.88rem", marginBottom: "1rem" }}>
              {formError}
            </div>
          )}
          <form
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", maxWidth: 600 }}
            onSubmit={handleSubmit}
          >
            <div>
              <label>Camp name</label>
              <input name="name" placeholder="e.g. Rotary Blood Drive" required />
            </div>
            <div>
              <label>Organizer</label>
              <input name="organizer" placeholder="e.g. Rotary Club Hyderabad" required />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Location / Venue</label>
              <input name="location" placeholder="Full address" required />
            </div>
            <div>
              <label>Date</label>
              <input type="date" name="campDate" required />
            </div>
            <div>
              <label>Time slot</label>
              <input name="timeSlot" placeholder="e.g. 09:00 – 17:00" required />
            </div>
            <div>
              <label>Expected donors</label>
              <input type="number" name="expectedDonors" min="1" placeholder="e.g. 200" />
            </div>
            <div>
              <label>Contact phone</label>
              <input type="tel" name="contactPhone" placeholder="+91 98765 43210" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button className="btn" type="submit" disabled={busy}>
                {busy ? "Scheduling…" : "Schedule camp"}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card title={`Upcoming camps (${upcoming.length})`}>
        {upcoming.length === 0 ? (
          <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>No upcoming camps scheduled.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Camp ID</th>
                <th>Name</th>
                <th>Location</th>
                <th>Date</th>
                <th>Time</th>
                <th>Organizer</th>
                <th>Expected</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, fontSize: "0.82rem" }}>{c.id}</td>
                  <td>{c.name}</td>
                  <td style={{ fontSize: "0.85rem" }}>{c.location}</td>
                  <td>{c.date}</td>
                  <td style={{ fontSize: "0.84rem", whiteSpace: "nowrap" }}>{c.time}</td>
                  <td style={{ fontSize: "0.85rem" }}>{c.organizer}</td>
                  <td>{c.expectedDonors}</td>
                  <td><Badge>Pending</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title={`Past camps (${completed.length})`}>
        <table>
          <thead>
            <tr>
              <th>Camp ID</th>
              <th>Name</th>
              <th>Location</th>
              <th>Date</th>
              <th>Organizer</th>
              <th>Expected</th>
              <th>Collected</th>
              <th>Yield</th>
            </tr>
          </thead>
          <tbody>
            {completed.map((c) => {
              const yieldPct = Math.round((c.unitsCollected / c.expectedDonors) * 100);
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, fontSize: "0.82rem" }}>{c.id}</td>
                  <td>{c.name}</td>
                  <td style={{ fontSize: "0.85rem" }}>{c.location}</td>
                  <td>{c.date}</td>
                  <td style={{ fontSize: "0.85rem" }}>{c.organizer}</td>
                  <td>{c.expectedDonors}</td>
                  <td style={{ fontWeight: 600 }}>{c.unitsCollected}</td>
                  <td>
                    <Badge>{yieldPct >= 80 ? "Fulfilled" : yieldPct >= 60 ? "Matched" : "Warning"}</Badge>
                    <span style={{ marginLeft: "0.4rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>{yieldPct}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
