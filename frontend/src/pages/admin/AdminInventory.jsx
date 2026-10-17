import { useState } from "react";
import { PageHeader, Card, Badge } from "../../components/UI";
import { useApi, api } from "../../lib/api";
import { BLOOD_GROUPS_FALLBACK } from "../../lib/utils";

export default function AdminInventory() {
  const { data: inventory, error, reload } = useApi(api.getInventory);
  const { data: groupData } = useApi(api.getBloodGroups);
  const bloodGroups = groupData || BLOOD_GROUPS_FALLBACK;
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  if (error) return <p className="empty-state">Couldn&apos;t load inventory.</p>;
  if (!inventory) return <p className="empty-state">Loading inventory…</p>;

  async function handleRestock(e) {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    const fd = new FormData(e.target);
    try {
      await api.restock({
        bloodGroup: fd.get("bloodGroup"),
        units: Number(fd.get("units")),
        collectedDate: fd.get("collectedDate") || undefined,
      });
      setShowForm(false);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventory management"
        subtitle="Stock is tracked FEFO — first-expiry units are surfaced for dispatch first."
        action={
          <button className="btn" onClick={() => { setShowForm(!showForm); setFormError(""); }}>
            {showForm ? "Cancel" : "+ Log new stock"}
          </button>
        }
      />

      {showForm && (
        <Card title="Log new stock">
          {formError && (
            <div style={{ background: "var(--crimson-tint)", color: "var(--crimson-deep)", padding: "0.7rem 1rem", borderRadius: 6, fontSize: "0.88rem", marginBottom: "1rem" }}>
              {formError}
            </div>
          )}
          <form
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", maxWidth: 640 }}
            onSubmit={handleRestock}
          >
            <div>
              <label>Blood group</label>
              <select name="bloodGroup" defaultValue="O+" required>
                {bloodGroups.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Units</label>
              <input type="number" name="units" min="1" defaultValue={1} required />
            </div>
            <div>
              <label>Collected date</label>
              <input type="date" name="collectedDate" />
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "0.3rem 0 0" }}>Whole blood expires ~42 days after collection.</p>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button className="btn" type="submit" disabled={busy}>
                {busy ? "Logging…" : "Add to stock"}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <table>
          <thead>
            <tr>
              <th>Blood group</th>
              <th>Units</th>
              <th>Near-expiry (72h)</th>
              <th>Earliest expiry</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((row) => (
              <tr key={row.bloodGroup}>
                <td style={{ fontWeight: 600 }}>{row.bloodGroup}</td>
                <td>{row.units}</td>
                <td>{row.nearExpiryUnits > 0 ? `${row.nearExpiryUnits} units` : "—"}</td>
                <td>{row.earliestExpiry}</td>
                <td><Badge>{row.units < 10 ? "Critical" : row.units < 20 ? "Warning" : "Fulfilled"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
