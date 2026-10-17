import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader, Card, Badge, toast } from "../../components/UI";
import { useApi, api } from "../../lib/api";

export default function AdminMatching() {
  const [searchParams] = useSearchParams();
  const { data: requests } = useApi(api.getRequests);
  const openRequests = (requests || []).filter((r) => r.status !== "Fulfilled");
  const [picked, setPicked] = useState(searchParams.get("request") || null);
  const activeId = picked || openRequests[0]?.id || null;

  const { data: donorMatches, error } = useApi(
    () => (activeId ? api.getRequestMatches(activeId) : Promise.resolve([])),
    [activeId]
  );

  const activeRequest = openRequests.find((r) => r.id === activeId);

  if (error) return <p className="empty-state">Couldn&apos;t load donor matches.</p>;
  if (!requests || !donorMatches) return <p className="empty-state">Loading donor matches…</p>;

  return (
    <div>
      <PageHeader
        title="Donor matching"
        subtitle={
          activeRequest
            ? `For ${activeRequest.id} · ${activeRequest.hospital} · ${activeRequest.bloodGroup} needed · ${activeRequest.units} units · ${activeRequest.urgency}`
            : "No open requests to match right now."
        }
        action={
          openRequests.length > 0 ? (
            <select
              value={activeId || ""}
              onChange={(e) => setPicked(e.target.value)}
              style={{ width: 170 }}
              aria-label="Pick a request"
            >
              {openRequests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {r.bloodGroup} · {r.urgency}
                </option>
              ))}
            </select>
          ) : null
        }
      />
      <Card title="Ranked by proximity and eligibility">
        {donorMatches.length === 0 ? (
          <div className="empty-state">No compatible donors found for this request.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Donor</th>
                <th>Blood group</th>
                <th>Distance</th>
                <th>Last donation</th>
                <th>Eligibility</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {donorMatches.map((d) => (
                <tr key={d.donorId}>
                  <td>{d.name}</td>
                  <td>{d.bloodGroup}</td>
                  <td>{d.distanceKm} km</td>
                  <td>{d.lastDonation}</td>
                  <td>
                    <Badge>{d.eligible ? "Fulfilled" : "Warning"}</Badge>
                  </td>
                  <td>
                    <button
                      className="btn"
                      disabled={!d.eligible}
                      style={{ opacity: d.eligible ? 1 : 0.4 }}
                      onClick={() =>
                        toast(`${d.name} notified for ${activeId}`, "Text-message alerts go live with the Twilio integration.")
                      }
                    >
                      Notify donor
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
