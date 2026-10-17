import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Droplets, HeartHandshake, CalendarClock, Clock, CheckCircle2,
  MapPin, Target, ArrowRight, Building2,
} from "lucide-react";
import { PageHeader, StatCard, Card, Badge } from "../../components/UI";
import { useApi, api } from "../../lib/api";
import { timeAgo } from "../../lib/utils";
import { getUser } from "../../lib/auth";
import "./Donor.css";

const DONATION_GAP_DAYS = 90;
const LIVES_PER_DONATION = 3;
const NEXT_MILESTONE = 10;

const dayMs = 86400000;
const daysBetween = (a, b) => Math.round((b - a) / dayMs);
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function DonorOverview() {
  const [responded, setResponded] = useState([]);
  const { data: donor, error: donorError } = useApi(api.getDonorMe);
  const { data: donationHistory } = useApi(api.getDonorHistory);
  const { data: matchAlerts } = useApi(api.getMatchAlerts);

  if (donorError) return <p className="empty-state">Couldn&apos;t load your dashboard.</p>;
  if (!donor || !donationHistory || !matchAlerts) {
    return <p className="empty-state">Loading your dashboard…</p>;
  }

  const userName = getUser()?.name || donor.name;
  const firstName = userName.split(" ")[0];

  // ── Eligibility math ──
  const lastDonation = donor.lastDonation ? new Date(donor.lastDonation) : null;
  const nextEligible = lastDonation
    ? new Date(lastDonation.getTime() + DONATION_GAP_DAYS * dayMs)
    : new Date();
  const today = new Date();
  const daysLeft = daysBetween(today, nextEligible);
  const isEligible = daysLeft <= 0;
  const cycleDone = Math.min(DONATION_GAP_DAYS, Math.max(0, DONATION_GAP_DAYS - Math.max(0, daysLeft)));
  const cyclePct = Math.round((cycleDone / DONATION_GAP_DAYS) * 100);
  const daysSinceDonation = lastDonation ? daysBetween(lastDonation, today) : null;

  // ── Impact math ──
  const livesTouched = donor.totalDonations * LIVES_PER_DONATION;
  const milestonePct = Math.min(100, Math.round((donor.totalDonations / NEXT_MILESTONE) * 100));

  // ── Rhythm math ──
  const sorted = [...donationHistory].map((d) => new Date(d.date)).sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((d, i) => daysBetween(sorted[i], d));
  const avgGap = gaps.length ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : null;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={`Donor ID ${donor.id} · ${donor.city || ""}`}
      />

      {/* ── Impact banner ── */}
      <section className="donor-impact">
        <div className="donor-impact__main">
          <span className="donor-impact__label">Your impact so far</span>
          <div className="donor-impact__number">{livesTouched}</div>
          <p className="donor-impact__sub">
            lives potentially saved across {donor.totalDonations} donations
          </p>
          <div className="donor-impact__milestone">
            <div className="donor-impact__milestone-top">
              <span className="meta"><Target size={14} /> Next milestone: {NEXT_MILESTONE} donations</span>
              <span>{donor.totalDonations}/{NEXT_MILESTONE}</span>
            </div>
            <div className="donor-impact__track">
              <div className="donor-impact__fill" style={{ width: `${milestonePct}%` }} />
            </div>
          </div>
          <Link to="/donor/camps" className="btn btn--light">
            Find donation camps<ArrowRight size={16} strokeWidth={2.4} />
          </Link>
        </div>
        <Droplets className="donor-impact__watermark" strokeWidth={1.2} />
      </section>

      {/* ── Stat cards ── */}
      <div className="stat-grid">
        <StatCard label="Blood group" value={donor.bloodGroup} icon={Droplets} tone="critical" />
        <StatCard label="Total donations" value={donor.totalDonations} icon={HeartHandshake} />
        <StatCard
          label="Avg. gap between donations"
          value={avgGap ? `${avgGap} days` : "—"}
          icon={CalendarClock}
          tone="info"
        />
      </div>

      <div className="donor-cols">
        {/* ── Eligibility tracker ── */}
        <Card title="Eligibility tracker">
          {isEligible ? (
            <div className="elig elig--ok">
              <span className="elig__icon"><CheckCircle2 size={22} strokeWidth={2.2} /></span>
              <div>
                <div className="elig__title">You&apos;re eligible to donate</div>
                <p className="elig__sub">
                  {lastDonation ? (
                    <>Last donation {fmtDate(donor.lastDonation)} · {daysSinceDonation} days ago</>
                  ) : (
                    <>No donations recorded yet — you can donate anytime.</>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="elig elig--wait">
              <span className="elig__icon"><Clock size={22} strokeWidth={2.2} /></span>
              <div>
                <div className="elig__title">{daysLeft} day{daysLeft === 1 ? "" : "s"} until you&apos;re eligible</div>
                <p className="elig__sub">Whole-blood donors wait {DONATION_GAP_DAYS} days between donations</p>
              </div>
            </div>
          )}
          <div className="elig__bar">
            <div className="elig__bar-top">
              <span>{lastDonation ? fmtDate(donor.lastDonation) : "—"}</span>
              <span>{isEligible ? "Eligible now" : fmtDate(nextEligible.toISOString())}</span>
            </div>
            <div className="elig__track">
              <div className={"elig__fill" + (isEligible ? " elig__fill--full" : "")} style={{ width: `${cyclePct}%` }} />
            </div>
            <div className="elig__bar-bottom">{cycleDone} of {DONATION_GAP_DAYS} days complete</div>
          </div>
          {isEligible && (
            <Link to="/donor/requests" className="btn" style={{ marginTop: "1rem" }}>
              Respond to urgent requests<ArrowRight size={15} strokeWidth={2.4} />
            </Link>
          )}
        </Card>

        {/* ── Matching requests ── */}
        <Card
          title={`Requests matching ${donor.bloodGroup}`}
          action={<Link to="/donor/requests" className="card__link">View all<ArrowRight size={14} /></Link>}
        >
          {matchAlerts.length === 0 ? (
            <div className="empty-state">No active requests match your blood group right now.</div>
          ) : (
            <div className="req-list">
              {matchAlerts.map((m) => (
                <div key={m.id} className="req-row">
                  <div className="req-row__main">
                    <div className="req-row__top">
                      <Badge>{m.urgency}</Badge>
                      <span className="req-row__hospital">{m.hospital}</span>
                    </div>
                    <div className="req-row__meta">
                      <span className="meta"><Droplets size={13} />{m.bloodGroup} · {m.unitsNeeded} units</span>
                      <span className="meta"><MapPin size={13} />{m.distanceKm} km</span>
                      <span className="meta"><Building2 size={13} />{timeAgo(m.postedAt)}</span>
                    </div>
                  </div>
                  {responded.includes(m.id) ? (
                    <span className="meta req-row__done"><CheckCircle2 size={15} strokeWidth={2.4} /> Responded</span>
                  ) : (
                    <button className="btn" onClick={() => setResponded([...responded, m.id])}>
                      Respond
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
