import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader, Card, Badge } from "../../components/UI";
import { useApi, api } from "../../lib/api";
import { timeAgo } from "../../lib/utils";

const STAGES = ["Pending", "Matching", "Matched", "Fulfilled"];

export default function RequestDetail() {
  const { reqId } = useParams();
  const { data: request, error, reload } = useApi(() => api.getRequest(reqId), [reqId]);
  const { data: donorMatches } = useApi(() => api.getRequestMatches(reqId), [reqId]);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  if (error) {
    return (
      <div>
        <PageHeader title="Request not found" />
        <Card>
          <p style={{ color: "var(--ink-soft)" }}>
            No request with ID <strong>{reqId}</strong> was found.{" "}
            <Link to="/hospital/requests" style={{ color: "var(--navy)", fontWeight: 600 }}>Go back to My Requests</Link>
          </p>
        </Card>
      </div>
    );
  }

  if (!request) return <p className="empty-state">Loading request…</p>;

  const donorMatchesForRequest = donorMatches || [];
  const currentIdx = STAGES.indexOf(request.status);

  async function confirmReceived() {
    setConfirmError("");
    setConfirming(true);
    try {
      await api.setRequestStatus(reqId, "Fulfilled");
      reload();
    } catch (err) {
      setConfirmError(err.message);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={`Request ${request.id}`}
        subtitle={`${request.hospital} — raised ${timeAgo(request.raisedAt)}`}
        action={
          <Link to="/hospital/requests" className="btn btn--ghost">← Back to requests</Link>
        }
      />

      {/* Status timeline */}
      <Card title="Request status">
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.2rem" }}>
          {STAGES.map((stage, i) => {
            const state = i < currentIdx ? "done" : i === currentIdx ? "current" : "pending";
            return (
              <div
                key={stage}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  padding: "0.5rem 0.3rem",
                  borderRadius: 6,
                  background: state === "pending" ? "#f0efed" : state === "current" ? "var(--navy-tint)" : "var(--green-tint)",
                  color: state === "pending" ? "var(--ink-soft)" : state === "current" ? "var(--navy)" : "var(--green)",
                }}
              >
                {state === "done" ? `✓ ${stage}` : stage}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Request details */}
      <Card title="Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", maxWidth: 520 }}>
          <div>
            <label>Blood group</label>
            <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{request.bloodGroup}</div>
          </div>
          <div>
            <label>Units needed</label>
            <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{request.units}</div>
          </div>
          <div>
            <label>Urgency</label>
            <div><Badge>{request.urgency}</Badge></div>
          </div>
          <div>
            <label>Current status</label>
            <div><Badge>{request.status}</Badge></div>
          </div>
          <div>
            <label>Patient name</label>
            <div style={{ fontSize: "0.92rem" }}>{request.patientName || "—"}</div>
          </div>
          <div>
            <label>Ward</label>
            <div style={{ fontSize: "0.92rem" }}>{request.ward || "—"}</div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Case notes</label>
            <div style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>{request.notes || "No notes."}</div>
          </div>
        </div>
      </Card>

      {/* Matched donors (show if status is Matching or beyond) */}
      {currentIdx >= 1 && (
        <Card title="Matched donors">
          <table>
            <thead>
              <tr>
                <th>Donor</th>
                <th>Blood group</th>
                <th>Distance</th>
                <th>Last donation</th>
                <th>Eligibility</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {donorMatchesForRequest.map((d) => (
                <tr key={d.donorId}>
                  <td>{d.name}</td>
                  <td>{d.bloodGroup}</td>
                  <td>{d.distanceKm} km</td>
                  <td>{d.lastDonation}</td>
                  <td>
                    <Badge>{d.eligible ? "Fulfilled" : "Warning"}</Badge>
                  </td>
                  <td style={{ fontSize: "0.84rem", color: "var(--ink-soft)" }}>
                    {d.eligible ? "Notified" : "Ineligible — skipped"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Accept / confirm actions */}
      {request.status === "Matched" && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button className="btn" onClick={confirmReceived} disabled={confirming}>
              {confirming ? "Confirming…" : "Confirm blood received"}
            </button>
            <span style={{ fontSize: "0.86rem", color: "var(--ink-soft)" }}>
              Mark as fulfilled once the blood units have been delivered and verified.
            </span>
          </div>
          {confirmError && (
            <p style={{ color: "var(--crimson-deep)", fontSize: "0.86rem", marginTop: "0.6rem" }}>
              {confirmError}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
