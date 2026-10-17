import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Card } from "../../components/UI";
import { useApi, api } from "../../lib/api";
import { BLOOD_GROUPS_FALLBACK } from "../../lib/utils";

export default function RaiseRequest() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: groupData } = useApi(api.getBloodGroups);
  const bloodGroups = groupData || BLOOD_GROUPS_FALLBACK;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.target);
    try {
      const created = await api.createRequest({
        bloodGroup: fd.get("bloodGroup"),
        units: Number(fd.get("units")) || 1,
        urgency: fd.get("urgency"),
        patientName: fd.get("patientName") || undefined,
        ward: fd.get("ward") || undefined,
        notes: fd.get("notes") || undefined,
      });
      setRequestId(created.id);
      setSubmitted(true);
      setTimeout(() => navigate(`/hospital/requests/${created.id}`), 1600);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Raise a blood request" subtitle="Mark it Critical if the patient can't wait for routine matching." />
      <Card>
        {submitted && (
          <div style={{ background: "var(--green-tint)", color: "var(--green)", padding: "0.7rem 1rem", borderRadius: 6, fontSize: "0.88rem", marginBottom: "1.1rem" }}>
            Request {requestId} submitted. If marked Critical, matching donors are notified immediately.
            Redirecting to the request…
          </div>
        )}
        {error && (
          <div style={{ background: "var(--crimson-tint)", color: "var(--crimson-deep)", padding: "0.7rem 1rem", borderRadius: 6, fontSize: "0.88rem", marginBottom: "1.1rem" }}>
            {error}
          </div>
        )}
        <form
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", maxWidth: 560 }}
          onSubmit={handleSubmit}
        >
          <div>
            <label>Blood group needed</label>
            <select name="bloodGroup" defaultValue="" required>
              <option value="" disabled>Select</option>
              {bloodGroups.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label>Units required</label>
            <input type="number" name="units" min="1" defaultValue={1} required />
          </div>
          <div>
            <label>Urgency</label>
            <select name="urgency" defaultValue="Routine">
              <option>Routine</option>
              <option>Urgent</option>
              <option>Critical</option>
            </select>
          </div>
          <div>
            <label>Patient name (optional)</label>
            <input name="patientName" placeholder="e.g. Ramesh K." />
          </div>
          <div>
            <label>Ward (optional)</label>
            <input name="ward" placeholder="e.g. ICU-4" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Patient / case notes (optional)</label>
            <textarea name="notes" rows={3} placeholder="e.g. Trauma case, ICU ward 4" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button className="btn" type="submit" disabled={busy || submitted}>
              {busy ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
