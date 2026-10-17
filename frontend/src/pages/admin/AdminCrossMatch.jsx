import { PageHeader, Card, Badge } from "../../components/UI";
import { useApi, api } from "../../lib/api";
import { timeAgo } from "../../lib/utils";

export default function AdminCrossMatch() {
  const { data: crossMatchRecords, error } = useApi(api.getCrossmatch);

  if (error) return <p className="empty-state">Couldn&apos;t load cross-match records.</p>;
  if (!crossMatchRecords) return <p className="empty-state">Loading cross-match records…</p>;

  return (
    <div>
      <PageHeader
        title="Cross-match records"
        subtitle="ABO/Rh compatibility testing between donor blood units and recipients."
      />

      <Card>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Test ID</th>
                <th>Donor</th>
                <th>Donor group</th>
                <th>Recipient</th>
                <th>Recipient group</th>
                <th>ABO</th>
                <th>Rh</th>
                <th>Antibody screen</th>
                <th>Result</th>
                <th>Tested by</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {crossMatchRecords.map((cm) => (
                <tr key={cm.id}>
                  <td style={{ fontWeight: 600, fontSize: "0.82rem" }}>{cm.id}</td>
                  <td>{cm.donorName}</td>
                  <td>{cm.donorGroup}</td>
                  <td>{cm.recipientName}</td>
                  <td>{cm.recipientGroup}</td>
                  <td><Badge>{cm.aboCompat === "Compatible" ? "Fulfilled" : "Critical"}</Badge></td>
                  <td><Badge>{cm.rhCompat === "Compatible" ? "Fulfilled" : "Critical"}</Badge></td>
                  <td style={{ fontSize: "0.84rem" }}>{cm.antibodyScreen}</td>
                  <td>
                    <Badge>{cm.crossMatchResult === "Compatible" ? "Fulfilled" : "Critical"}</Badge>
                  </td>
                  <td style={{ fontSize: "0.84rem" }}>{cm.testedBy}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                    {timeAgo(cm.testedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Compatibility reference">
        <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)", marginBottom: "0.8rem" }}>
          Cross-matching confirms in-vitro compatibility before transfusion. A complete cross-match includes:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.8rem" }}>
          {[
            { step: "1. ABO typing", desc: "Verifies donor and recipient ABO groups are compatible." },
            { step: "2. Rh typing", desc: "Checks Rh(D) antigen compatibility to prevent hemolytic reactions." },
            { step: "3. Antibody screen", desc: "Detects irregular antibodies (e.g. Anti-Kell, Anti-Duffy) in recipient serum." },
            { step: "4. Cross-match test", desc: "Final mix of donor cells + recipient serum to confirm no agglutination." },
          ].map((s) => (
            <div key={s.step} style={{ padding: "0.8rem", background: "var(--paper)", borderRadius: 8 }}>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.3rem" }}>{s.step}</div>
              <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
