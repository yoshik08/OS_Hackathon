import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import {
  Cross, Siren, Phone, ArrowRight, Droplets, Hospital, ShieldCheck,
  Zap, Users, Building2, Activity,
  Database, HeartHandshake, BrainCircuit, FlaskConical, Tent,
} from "lucide-react";
import { useApi, api } from "../lib/api";
import "./Landing.css";

const features = [
  { icon: Database, title: "Blood Inventory", desc: "FEFO-aware stock tracking with expiry alerts and real-time unit counts across all blood groups." },
  { icon: Siren, title: "Emergency Requests", desc: "Critical requests trigger instant donor matching and SMS notifications within minutes." },
  { icon: HeartHandshake, title: "Donor Matching", desc: "Location-based matching ranks eligible donors by proximity, eligibility, and availability." },
  { icon: BrainCircuit, title: "AI Demand Prediction", desc: "Time-series forecasting flags shortage risk before it becomes critical using historical data." },
  { icon: FlaskConical, title: "Cross-Match Records", desc: "ABO/Rh compatibility testing logs for every donor-recipient pair with full audit trail." },
  { icon: Tent, title: "Camp Management", desc: "Schedule donation drives, track RSVPs, and measure camp yield across the city." },
];

const stats = [
  { value: "1,284", label: "Registered donors" },
  { value: "126", label: "Units in stock" },
  { value: "6.4h", label: "Avg. fulfillment" },
  { value: "97%", label: "Match success" },
];

const steps = [
  { num: "01", title: "Register", desc: "Donors sign up with blood group, location, and medical eligibility in under two minutes." },
  { num: "02", title: "Request & match", desc: "Hospitals raise requests. The system auto-matches nearby eligible donors, ranked by proximity." },
  { num: "03", title: "Deliver & track", desc: "Cross-match testing, dispatch tracking, and fulfillment confirmation — all in one flow." },
];

const portals = [
  { key: "donor", icon: Droplets, label: "Donor Portal", desc: "Track eligibility, respond to emergencies, discover nearby camps, and manage your donation history.", path: "/donor", color: "var(--crimson)" },
  { key: "hospital", icon: Hospital, label: "Hospital Portal", desc: "Raise blood requests, track fulfillment stages, search live inventory, and confirm deliveries.", path: "/hospital", color: "var(--navy)" },
  { key: "admin", icon: ShieldCheck, label: "Admin Portal", desc: "Manage stock, match donors, run cross-match tests, schedule camps, and review AI forecasts.", path: "/admin", color: "var(--crimson-dark)" },
];

function InventoryPreview() {
  const { data: inventory } = useApi(api.getInventory);

  if (!inventory || inventory.length === 0) {
    return (
      <div className="land-preview">
        <div className="land-preview__head">
          <span className="land-preview__live"><span className="land-preview__dot" />Live inventory</span>
          <span className="land-preview__bank">City Central Blood Bank</span>
        </div>
        <div className="land-preview__bars">
          <p className="empty-state" style={{ padding: "1.5rem" }}>Inventory is loading…</p>
        </div>
      </div>
    );
  }

  const totalUnits = inventory.reduce((s, r) => s + r.units, 0);
  const nearExpiry = inventory.reduce((s, r) => s + r.nearExpiryUnits, 0);
  const maxUnits = Math.max(...inventory.map((r) => r.units));

  return (
    <div className="land-preview">
      <div className="land-preview__head">
        <span className="land-preview__live"><span className="land-preview__dot" />Live inventory</span>
        <span className="land-preview__bank">City Central Blood Bank</span>
      </div>
      <div className="land-preview__bars">
        {inventory.map((row) => {
          const low = row.units < 10;
          return (
            <div key={row.bloodGroup} className="land-preview__row">
              <span className="land-preview__group">{row.bloodGroup}</span>
              <div className="land-preview__track">
                <div
                  className={"land-preview__fill" + (low ? " land-preview__fill--low" : "")}
                  style={{ width: `${Math.max(6, (row.units / maxUnits) * 100)}%` }}
                />
              </div>
              <span className="land-preview__units">{row.units}</span>
              {low && <span className="land-preview__low">Low</span>}
            </div>
          );
        })}
      </div>
      <div className="land-preview__foot">
        <div><strong>{totalUnits}</strong><span>units in stock</span></div>
        <div><strong>{nearExpiry}</strong><span>near expiry</span></div>
        <div><strong>2</strong><span>critical requests</span></div>
      </div>
    </div>
  );
}

export default function Landing() {
  const sectionsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("land-visible");
        });
      },
      { threshold: 0.1 }
    );
    sectionsRef.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const addRef = (el) => {
    if (el && !sectionsRef.current.includes(el)) sectionsRef.current.push(el);
  };

  return (
    <div className="land">
      {/* ── Emergency strip ── */}
      <div className="land-emergency">
        <Siren size={14} strokeWidth={2.4} />
        <span>Medical emergency? Call our 24/7 helpline</span>
        <a href="tel:18004190000"><Phone size={13} strokeWidth={2.4} />1800-419-0000</a>
      </div>

      {/* ── Navbar ── */}
      <nav className="land-nav">
        <div className="land-nav__inner">
          <Link to="/" className="land-nav__brand">
            <span className="land-nav__mark"><Cross size={16} strokeWidth={2.8} /></span>
            <span className="land-nav__name">RaktaSetu</span>
          </Link>
          <div className="land-nav__links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#portals">Portals</a>
          </div>
          <div className="land-nav__actions">
            <Link to="/login" className="land-btn land-btn--ghost">Sign in</Link>
            <Link to="/register" className="land-btn land-btn--solid">Register</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="land-hero">
        <svg className="land-hero__pulse-line" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M0,60 L380,60 L410,60 L425,20 L440,95 L455,45 L470,60 L700,60 L730,60 L745,25 L760,90 L775,50 L790,60 L1020,60 L1050,60 L1065,20 L1080,95 L1095,45 L1110,60 L1440,60"
            fill="none" stroke="var(--crimson)" strokeWidth="2" opacity="0.35"
            strokeDasharray="6 8" className="land-hero__pulse-dash"
          />
        </svg>
        <div className="land-hero__inner">
          <div className="land-hero__content">
            <div className="land-hero__badge"><Activity size={14} strokeWidth={2.4} />Smart blood management system</div>
            <h1 className="land-hero__title">
              The right blood,<br />
              to the right patient,<br />
              <span className="land-hero__accent">right on time.</span>
            </h1>
            <p className="land-hero__desc">
              RaktaSetu unifies donors, hospitals, and blood banks in one live network —
              real-time inventory, instant emergency matching, and AI demand forecasting
              that flags shortages before they turn critical.
            </p>
            <div className="land-hero__cta">
              <Link to="/register" className="land-btn land-btn--solid land-btn--lg">
                Register as a donor<ArrowRight size={17} strokeWidth={2.4} />
              </Link>
              <Link to="/login" className="land-btn land-btn--ghost land-btn--lg">Explore the portals</Link>
            </div>
            <div className="land-hero__trust">
              <span className="meta"><Users size={15} /><strong>1,284</strong>&nbsp;donors</span>
              <span className="meta"><Building2 size={15} /><strong>46</strong>&nbsp;hospitals</span>
              <span className="meta"><Zap size={15} /><strong>6.4h</strong>&nbsp;avg. fulfillment</span>
            </div>
          </div>
          <div className="land-hero__visual" ref={addRef}>
            <InventoryPreview />
            <div className="land-float land-float--a">
              <ShieldCheck size={16} strokeWidth={2.4} />
              <div><strong>97%</strong><span>match success</span></div>
            </div>
            <div className="land-float land-float--b">
              <Siren size={16} strokeWidth={2.4} />
              <div><strong>2 critical</strong><span>requests matched</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="land-stats" ref={addRef}>
        {stats.map((s) => (
          <div key={s.label} className="land-stats__item">
            <div className="land-stats__value">{s.value}</div>
            <div className="land-stats__label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section className="land-section" id="features" ref={addRef}>
        <div className="land-section__header">
          <span className="land-section__tag">Features</span>
          <h2>Everything you need to <em>manage blood</em>, intelligently.</h2>
          <p>Six core modules working together to eliminate shortages and save lives.</p>
        </div>
        <div className="land-features-grid">
          {features.map((f) => (
            <div key={f.title} className="land-feature-card" ref={addRef}>
              <span className="land-feature-card__icon"><f.icon size={22} strokeWidth={2} /></span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="land-section land-section--dark" id="how-it-works" ref={addRef}>
        <div className="land-section__header">
          <span className="land-section__tag">How it works</span>
          <h2>From registration to transfusion — <em>in three steps.</em></h2>
        </div>
        <div className="land-steps">
          {steps.map((s) => (
            <div key={s.num} className="land-step" ref={addRef}>
              <div className="land-step__num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Portals ── */}
      <section className="land-section" id="portals" ref={addRef}>
        <div className="land-section__header">
          <span className="land-section__tag">Portals</span>
          <h2>Three dedicated portals. <em>One unified system.</em></h2>
          <p>Each role gets a tailored workspace designed around its workflow.</p>
        </div>
        <div className="land-roles-grid">
          {portals.map((r) => (
            <Link key={r.key} to={r.path} className="land-role-card" ref={addRef}>
              <div className="land-role-card__bar" style={{ background: r.color }} />
              <span className="land-role-card__icon" style={{ background: `color-mix(in srgb, ${r.color} 10%, transparent)`, color: r.color }}>
                <r.icon size={20} strokeWidth={2.1} />
              </span>
              <h3>{r.label}</h3>
              <p>{r.desc}</p>
              <span className="land-role-card__link">Enter dashboard<ArrowRight size={15} strokeWidth={2.4} /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="land-cta" ref={addRef}>
        <div className="land-cta__inner">
          <Droplets size={30} strokeWidth={1.8} className="land-cta__drop" />
          <h2>A single donation can save <em>multiple lives.</em></h2>
          <p>Join the network — or raise an urgent request in under a minute.</p>
          <div className="land-cta__actions">
            <Link to="/register" className="land-btn land-btn--light land-btn--lg">Register as a donor</Link>
            <Link to="/login?role=hospital" className="land-btn land-btn--outline-light land-btn--lg">Request blood</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="land-footer">
        <div className="land-footer__grid">
          <div>
            <div className="land-footer__brand">
              <span className="land-nav__mark"><Cross size={15} strokeWidth={2.8} /></span>
              <span>RaktaSetu</span>
            </div>
            <p className="land-footer__tagline">The live network connecting blood donors, hospitals, and blood banks.</p>
          </div>
          <div>
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#portals">Portals</a>
          </div>
          <div>
            <h4>Portals</h4>
            <Link to="/donor">Donor login</Link>
            <Link to="/hospital">Hospital login</Link>
            <Link to="/admin">Admin login</Link>
          </div>
          <div>
            <h4>Emergency</h4>
            <a href="tel:18004190000" className="land-footer__helpline"><Phone size={13} />1800-419-0000</a>
            <span className="land-footer__note">24/7 critical blood helpline</span>
          </div>
        </div>
        <div className="land-footer__bottom">
          <span>© 2026 RaktaSetu. Built for smarter blood banking.</span>
        </div>
      </footer>
    </div>
  );
}
