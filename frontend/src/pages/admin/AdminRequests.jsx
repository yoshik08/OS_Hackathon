import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Card, Badge } from "../../components/UI";
import { useApi, api } from "../../lib/api";
import { timeAgo } from "../../lib/utils";

const STAGES = ["Pending", "Matching", "Matched", "Fulfilled"];

export default function AdminRequests() {
  const { data: hospitalRequests, error, reload } = useApi(api.getRequests);
  const [updating, setUpdating] = useState(null);

  if (error) return <p className="empty-state">Couldn&apos;t load requests.</p>;
  if (!hospitalRequests) return <p className="empty-state">Loading requests…</p>;

  async function changeStatus(id, status) {
    setUpdating(id);
    try {
      await api.setRequestStatus(id, status);
      reload();
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      <PageHeader title="Hospital requests" subtitle="Approve, match, or dispatch against current stock." />
      <Card>
        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Hospital</th>
              <th>Blood group</th>
              <th>Units</th>
              <th>Urgency</th>
              <th>Status</th>
              <th>Raised</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {hospitalRequests.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.hospital}</td>
                <td>{r.bloodGroup}</td>
                <td>{r.units}</td>
                <td><Badge>{r.urgency}</Badge></td>
                <td>
                  <select
                    value={r.status}
                    disabled={updating === r.id}
                    onChange={(e) => changeStatus(r.id, e.target.value)}
                    style={{ width: 130, fontSize: "0.82rem" }}
                    aria-label={`Status for ${r.id}`}
                  >
                    {STAGES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>{timeAgo(r.raisedAt)}</td>
                <td>
                  <Link
                    to={`/admin/matching?request=${r.id}`}
                    className="btn btn--ghost"
                    style={{ fontSize: "0.8rem", padding: "0.4rem 0.7rem" }}
                  >
                    Match donors
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
