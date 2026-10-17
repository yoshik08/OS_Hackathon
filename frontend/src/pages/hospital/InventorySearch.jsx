import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Droplets, TriangleAlert, Timer, ArrowRight, PackageCheck } from "lucide-react";
import { PageHeader, Badge } from "../../components/UI";
import { useApi, api } from "../../lib/api";
import "./Hospital.css";

const LOW_THRESHOLD = 10;

function stockStatus(units) {
  if (units < LOW_THRESHOLD) return "Critical";
  if (units < 20) return "Warning";
  return "Healthy";
}

export default function InventorySearch() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const { data: inventory, error } = useApi(api.getInventory);

  const rows = useMemo(() => {
    if (!inventory) return [];
    const q = query.trim().toLowerCase().replace(/\s+/g, "");
    return inventory.filter((r) => {
      if (q && !r.bloodGroup.toLowerCase().replace(/\s+/g, "").includes(q)) return false;
      if (filter === "low" && r.units >= LOW_THRESHOLD) return false;
      if (filter === "expiry" && r.nearExpiryUnits === 0) return false;
      return true;
    });
  }, [query, filter, inventory]);

  if (error) return <p className="empty-state">Couldn&apos;t load inventory.</p>;
  if (!inventory) return <p className="empty-state">Loading inventory…</p>;

  const maxUnits = Math.max(...inventory.map((r) => r.units));

  const totalUnits = inventory.reduce((s, r) => s + r.units, 0);
  const lowCount = inventory.filter((r) => r.units < LOW_THRESHOLD).length;
  const expiryUnits = inventory.reduce((s, r) => s + r.nearExpiryUnits, 0);

  return (
    <div>
      <PageHeader title="Bank-wide inventory" subtitle="Live stock at the connected blood bank, by group." />

      <div className="inv-summary">
        <div className="inv-summary__item">
          <span className="meta"><PackageCheck size={15} /> Total stock</span>
          <strong>{totalUnits} units</strong>
        </div>
        <div className="inv-summary__item inv-summary__item--warn">
          <span className="meta"><TriangleAlert size={15} /> Groups below {LOW_THRESHOLD} units</span>
          <strong>{lowCount}</strong>
        </div>
        <div className="inv-summary__item inv-summary__item--warn">
          <span className="meta"><Timer size={15} /> Expiring within 72h</span>
          <strong>{expiryUnits} units</strong>
        </div>
      </div>

      <div className="inv-toolbar">
        <label className="inv-search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Search blood group — e.g. O-"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="inv-filters">
          {[
            ["all", "All groups"],
            ["low", "Low stock"],
            ["expiry", "Near expiry"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={"chip" + (filter === key ? " chip--active" : "")}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">No blood groups match your search.</div>
      ) : (
        <div className="inv-grid">
          {rows.map((r) => {
            const status = stockStatus(r.units);
            return (
              <div key={r.bloodGroup} className={`inv-card inv-card--${status.toLowerCase()}`}>
                <div className="inv-card__top">
                  <span className="inv-card__group"><Droplets size={18} strokeWidth={2.2} />{r.bloodGroup}</span>
                  <Badge>{status}</Badge>
                </div>
                <div className="inv-card__units">
                  <strong>{r.units}</strong><span>units available</span>
                </div>
                <div className="inv-card__track">
                  <div
                    className="inv-card__fill"
                    style={{ width: `${Math.round((r.units / maxUnits) * 100)}%` }}
                  />
                </div>
                <div className="inv-card__meta">
                  {r.nearExpiryUnits > 0 ? (
                    <span className="meta inv-card__expiry">
                      <Timer size={13} />{r.nearExpiryUnits} expiring within 72h
                    </span>
                  ) : (
                    <span className="meta">No units near expiry</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lowCount > 0 && (
        <Link to="/hospital/request" className="card__link inv-cta">
          Running low on a group you need? Raise a request<ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
