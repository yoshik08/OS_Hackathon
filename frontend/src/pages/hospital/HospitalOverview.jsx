import { Link } from "react-router-dom";
import {
  ClipboardList, Siren, CheckCircle2, ArrowRight, Droplets,
  User, BedDouble, Clock,
} from "lucide-react";
import { PageHeader, StatCard, Card, Badge } from "../../components/UI";
import { useApi, api } from "../../lib/api";
import { timeAgo } from "../../lib/utils";
import "./Hospital.css";

const STEPS = ["Pending", "Matching", "Matched", "Fulfilled"];
const urgencyRank = { Critical: 0, Urgent: 1, Routine: 2 };

function stepIndex(status) {
  const i = STEPS.indexOf(status);
  return i === -1 ? 0 : i;
}

function RequestTimelineItem({ req, last }) {
  const idx = stepIndex(req.status);
  return (
    <div className={"tl-item" + (last ? " tl-item--last" : "")}>
      <div className="tl-rail">
        <span className={`tl-dot tl-dot--${req.urgency.toLowerCase()}`} />
        {!last && <span className="tl-line" />}
      </div>
      <div className="tl-body">
        <div className="tl-top">
          <span className="tl-id">{req.id}</span>
          <Badge>{req.urgency}</Badge>
          <Badge>{req.status}</Badge>
          <span className="meta tl-raised"><Clock size={13} />{timeAgo(req.raisedAt)}</span>
        </div>
        <div className="tl-patient">
          <span className="meta"><User size={13} />{req.patientName}</span>
          <span className="meta"><BedDouble size={13} />{req.ward}</span>
          <span className="meta"><Droplets size={13} />{req.bloodGroup} · {req.units} unit{req.units === 1 ? "" : "s"}</span>
        </div>
        <p className="tl-notes">{req.notes}</p>
        <div className="tl-steps">
          {STEPS.map((s, i) => (
            <span key={s} className={"tl-step" + (i < idx ? " tl-step--done" : i === idx ? " tl-step--now" : "")}>
              {i < idx ? <CheckCircle2 size={13} strokeWidth={2.6} /> : null}
              {s}
            </span>
          ))}
        </div>
        <Link to={`/hospital/requests/${req.id}`} className="card__link">
          View details<ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

export default function HospitalOverview() {
  const { data: hospitalRequests, error } = useApi(api.getMyRequests);
  const { data: me } = useApi(api.getMe);

  if (error) return <p className="empty-state">Couldn&apos;t load your requests.</p>;
  if (!hospitalRequests) return <p className="empty-state">Loading your requests…</p>;

  const active = hospitalRequests.filter((r) => r.status !== "Fulfilled");
  const critical = active.filter((r) => r.urgency === "Critical");
  const sorted = [...hospitalRequests].sort(
    (a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency] || new Date(b.raisedAt) - new Date(a.raisedAt)
  );

  return (
    <div>
      <PageHeader title={me?.profile ? `${me.profile.name}, ${me.profile.location}` : "Hospital"} subtitle="Blood request command center" />

      <div className="stat-grid">
        <StatCard label="Active requests" value={active.length} icon={ClipboardList} />
        <StatCard label="Critical right now" value={critical.length} icon={Siren} tone="critical" />
        <StatCard
          label="Fulfilled this month"
          value={hospitalRequests.filter((r) => r.status === "Fulfilled").length}
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      {critical.length > 0 && (
        <section className="hosp-alert">
          <span className="hosp-alert__icon"><Siren size={22} strokeWidth={2.2} /></span>
          <div className="hosp-alert__main">
            <div className="hosp-alert__title">
              {critical.length} critical request{critical.length === 1 ? "" : "s"} need{critical.length === 1 ? "s" : ""} immediate attention
            </div>
            <div className="hosp-alert__sub">
              {critical.map((r) => (
                <span key={r.id} className="meta">
                  <Droplets size={13} />{r.bloodGroup} · {r.units} units · {r.patientName} ({r.ward})
                </span>
              ))}
            </div>
          </div>
          <Link to="/hospital/requests" className="btn btn--light">Review now</Link>
        </section>
      )}

      <Card title="Request timeline" action={<Link to="/hospital/requests" className="card__link">My requests<ArrowRight size={14} /></Link>}>
        <div className="tl">
          {sorted.map((r, i) => (
            <RequestTimelineItem key={r.id} req={r} last={i === sorted.length - 1} />
          ))}
        </div>
      </Card>
    </div>
  );
}
