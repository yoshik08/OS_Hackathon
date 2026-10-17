import { useEffect, useState } from "react";
import { PageHeader, Card } from "../../components/UI";
import { useApi, api } from "../../lib/api";
import { BLOOD_GROUPS_FALLBACK } from "../../lib/utils";

export default function DonorProfile() {
  const { data: donor, error } = useApi(api.getDonorMe);
  const { data: groupData } = useApi(api.getBloodGroups);
  const bloodGroups = groupData || BLOOD_GROUPS_FALLBACK;

  const [form, setForm] = useState({ city: "", phone: "", bloodGroup: "" });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (donor) {
      setForm({
        city: donor.city || "",
        phone: donor.phone || "",
        bloodGroup: donor.bloodGroup || "",
      });
    }
  }, [donor]);

  if (error) return <p className="empty-state">Couldn&apos;t load your profile.</p>;
  if (!donor) return <p className="empty-state">Loading your profile…</p>;

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSaved(false);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError("");
    setBusy(true);
    try {
      await api.updateDonorMe({
        city: form.city,
        phone: form.phone,
        bloodGroup: form.bloodGroup,
      });
      localStorage.setItem(
        "userSub",
        [form.bloodGroup, form.city].filter(Boolean).join(" · ") || "Donor"
      );
      setSaved(true);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="My profile" subtitle="Keep this accurate — it's what hospitals see when you're matched." />
      <Card>
        <form
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", maxWidth: 560 }}
          onSubmit={handleSubmit}
        >
          <div>
            <label>Full name</label>
            <input defaultValue={donor.name} disabled title="Name can't be changed here" />
          </div>
          <div>
            <label>Blood group</label>
            <select value={form.bloodGroup} onChange={set("bloodGroup")}>
              {bloodGroups.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label>City</label>
            <input value={form.city} onChange={set("city")} placeholder="e.g. Hyderabad" />
          </div>
          <div>
            <label>Contact number</label>
            <input value={form.phone} onChange={set("phone")} placeholder="+91 " />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Donor ID</label>
            <input defaultValue={donor.id} disabled />
          </div>
          {saveError && (
            <div style={{ gridColumn: "1 / -1", color: "var(--crimson-deep)", fontSize: "0.88rem" }}>
              {saveError}
            </div>
          )}
          {saved && (
            <div style={{ gridColumn: "1 / -1", color: "var(--green)", fontSize: "0.88rem", fontWeight: 600 }}>
              Profile saved.
            </div>
          )}
          <div style={{ gridColumn: "1 / -1" }}>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
