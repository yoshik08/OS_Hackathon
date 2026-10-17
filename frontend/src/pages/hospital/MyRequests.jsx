import { Link } from "react-router-dom";
import { PageHeader, Card, Badge } from "../../components/UI";
import { useApi, api } from "../../lib/api";
import { timeAgo } from "../../lib/utils";

const STAGES = ["Pending", "Matching", "Matched", "Fulfilled"];

export default function MyRequests() {
  const { data: hospitalRequests, error } = useApi(api.getMyRequests);

  if (error) return <p className="empty-state">Couldn&apos;t load your requests.</p>;
  if (!hospitalRequests) return <p className="empty-state">Loading your requests…</p>;

  return (
    <div>
      <PageHeader title="My requests" subtitle="Track each request from submission to fulfilment." />
      {hospitalRequests.map((r) => (
        <Card key={r.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{r.id} · {r.bloodGroup} · {r.units} unit(s)</div>
              <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: "0.2rem" }}>Raised {timeAgo(r.raisedAt)}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Badge>{r.urgency}</Badge>
              <Link
                to={`/hospital/requests/${r.id}`}
                className="btn btn--ghost"
                style={{ fontSize: "0.8rem", padding: "0.35rem 0.7rem" }}
              >
                View details →
              </Link>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {STAGES.map((stage) => {
              const currentIdx = STAGES.indexOf(r.status);
              const stageIdx = STAGES.indexOf(stage);
              const state = stageIdx < currentIdx ? "done" : stageIdx === currentIdx ? "current" : "pending";
              return (
                <div
                  key={stage}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    padding: "0.4rem 0.2rem",
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
      ))}
    </div>
  );
}
