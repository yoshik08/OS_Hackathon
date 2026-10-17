import express from "express";
import { pool } from "../db.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();
router.use(requireRole("admin"));

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// ── GET /api/admin/stats ── adminStats shape ──────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [[donors]] = await pool.query("SELECT COUNT(*) AS n FROM donors");
    const [[stock]] = await pool.query("SELECT COALESCE(SUM(units),0) AS n FROM v_inventory");
    const [[pending]] = await pool.query(
      "SELECT COUNT(*) AS n FROM blood_requests WHERE status IN ('Pending','Matching')"
    );
    const [[alerts]] = await pool.query("SELECT COUNT(*) AS n FROM alerts WHERE is_resolved = FALSE");
    res.json({
      totalDonors: donors.n,
      totalUnitsInStock: stock.n,
      pendingRequests: pending.n,
      activeAlerts: alerts.n,
    });
  } catch (err) {
    console.error("admin/stats:", err.message);
    res.status(500).json({ error: "Couldn't load dashboard stats." });
  }
});

// ── GET /api/admin/reports ── reportStats shape ───────────────────────────────
router.get("/reports", async (req, res) => {
  try {
    // Last 6 calendar months, oldest -> newest.
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("en", { month: "short" }),
      });
    }
    const since = months[0].ym + "-01";

    const [collected] = await pool.query(
      `SELECT DATE_FORMAT(donation_date, '%Y-%m') AS ym, SUM(units) AS n
       FROM donations WHERE donation_date >= ? AND status = 'Completed' GROUP BY ym`,
      [since]
    );
    const [distributed] = await pool.query(
      `SELECT DATE_FORMAT(fulfilled_at, '%Y-%m') AS ym, SUM(units_needed) AS n
       FROM blood_requests WHERE fulfilled_at >= ? AND status = 'Fulfilled' GROUP BY ym`,
      [since]
    );
    const colMap = Object.fromEntries(collected.map((r) => [r.ym, Number(r.n)]));
    const disMap = Object.fromEntries(distributed.map((r) => [r.ym, Number(r.n)]));
    const monthlyCollections = months.map((m) => ({
      month: m.label,
      collected: colMap[m.ym] || 0,
      distributed: disMap[m.ym] || 0,
    }));

    const [groups] = await pool.query(
      `SELECT blood_group AS g, SUM(units) AS u FROM blood_batches
       WHERE status = 'available' GROUP BY blood_group`
    );
    const totalUnits = groups.reduce((s, r) => s + Number(r.u), 0) || 1;
    const groupDistribution = BLOOD_GROUPS.map((g) => ({
      group: g,
      percentage: Math.round(((groups.find((r) => r.g === g)?.u || 0) / totalUnits) * 100),
    }));

    const [[waste]] = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN status IN ('expired','discarded') THEN units ELSE 0 END),0) AS wasted,
              COALESCE(SUM(units),0) AS total FROM blood_batches`
    );
    const expiryWastePercent =
      waste.total > 0 ? Math.round((waste.wasted / waste.total) * 1000) / 10 : 0;

    const [[ful]] = await pool.query(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, raised_at, fulfilled_at)) / 60 AS h
       FROM blood_requests WHERE status = 'Fulfilled' AND fulfilled_at IS NOT NULL`
    );
    const avgFulfillmentHours = ful.h == null ? 0 : Math.round(ful.h * 10) / 10;

    const [top] = await pool.query(
      `SELECT CONCAT(h.name, IF(h.location IS NULL OR h.location = '', '', CONCAT(', ', h.location))) AS name,
              COUNT(*) AS requests, COALESCE(SUM(r.units_fulfilled),0) AS unitsFulfilled
       FROM blood_requests r JOIN hospitals h ON h.id = r.hospital_id
       GROUP BY h.id ORDER BY requests DESC LIMIT 5`
    );

    res.json({
      monthlyCollections,
      groupDistribution,
      expiryWastePercent,
      avgFulfillmentHours,
      topRequestingHospitals: top.map((r) => ({
        name: r.name, requests: r.requests, unitsFulfilled: Number(r.unitsFulfilled),
      })),
    });
  } catch (err) {
    console.error("admin/reports:", err.message);
    res.status(500).json({ error: "Couldn't load reports." });
  }
});

// ── GET /api/admin/forecast ── demand forecast + shortage risk + restock ──────
router.get("/forecast", async (req, res) => {
  try {
    // Daily requested units per group, last 14 days.
    const [daily] = await pool.query(
      `SELECT blood_group AS g, DATE(raised_at) AS d, SUM(units_needed) AS n
       FROM blood_requests WHERE raised_at >= CURDATE() - INTERVAL 14 DAY
       GROUP BY g, d`
    );
    const byGroup = {};
    for (const g of BLOOD_GROUPS) byGroup[g] = {};
    for (const r of daily) {
      const key = new Date(r.d).toISOString().slice(0, 10);
      byGroup[r.g][key] = Number(r.n);
    }

    // Labels: last 5 days (actual) + next 2 days (predicted).
    const days = [];
    for (let i = 4; i >= 1; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleString("en", { weekday: "short" }), future: false });
    }
    for (let i = 0; i <= 1; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      days.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleString("en", { weekday: "short" }), future: true });
    }

    const avgDaily = {};
    for (const g of BLOOD_GROUPS) {
      const vals = Object.values(byGroup[g]);
      avgDaily[g] = vals.length ? vals.reduce((s, v) => s + v, 0) / 14 : 0;
    }

    const demandForecast = {};
    for (const g of BLOOD_GROUPS) {
      demandForecast[g] = days.map((d) => ({
        day: d.label,
        actual: d.future ? null : byGroup[g][d.key] || 0,
        predicted: Math.round(avgDaily[g] * 10) / 10,
      }));
    }

    const [stock] = await pool.query("SELECT blood_group AS g, units FROM v_inventory");
    const stockMap = Object.fromEntries(stock.map((r) => [r.g, Number(r.units)]));

    const shortageRisk = BLOOD_GROUPS.map((g) => {
      const currentStock = stockMap[g] || 0;
      const predictedWeeklyDemand = Math.round(avgDaily[g] * 7);
      const dailyDemand = predictedWeeklyDemand / 7;
      const daysOfSupply = dailyDemand > 0 ? Math.round((currentStock / dailyDemand) * 10) / 10 : 99;
      const risk = daysOfSupply < 1 ? "Critical" : daysOfSupply < 3 ? "Warning" : "Routine";
      return { group: g, currentStock, predictedWeeklyDemand, daysOfSupply, risk };
    });

    const restockRecommendations = shortageRisk
      .filter((r) => r.risk !== "Routine")
      .map((r) => ({
        group: r.group,
        action:
          r.risk === "Critical"
            ? "Urgent: activate the emergency donor pool and request units from neighbouring banks"
            : "Schedule a targeted donation camp within 48 hours",
        targetUnits: Math.max(0, r.predictedWeeklyDemand - r.currentStock),
        priority: r.risk,
      }))
      .sort((a, b) => (a.priority === "Critical" ? -1 : 1));

    res.json({ demandForecast, shortageRisk, restockRecommendations });
  } catch (err) {
    console.error("admin/forecast:", err.message);
    res.status(500).json({ error: "Couldn't load the forecast." });
  }
});

export default router;
