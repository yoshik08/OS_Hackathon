import express from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { nextId } from "../utils/ids.js";
import { haversineKm } from "../utils/geo.js";

const router = express.Router();
// Recipient group -> donor groups that can donate to it.
const CAN_RECEIVE_FROM = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};
const BLOOD_GROUPS = Object.keys(CAN_RECEIVE_FROM);
const STATUSES = ["Pending", "Matching", "Matched", "Fulfilled", "Cancelled"];

const SELECT_LIST = `
  SELECT r.id, CONCAT(h.name, IF(h.location IS NULL OR h.location = '', '', CONCAT(', ', h.location))) AS hospital,
         r.blood_group AS bloodGroup, r.units_needed AS units, r.urgency, r.status,
         DATE_FORMAT(r.raised_at, '%Y-%m-%dT%H:%i:%s') AS raisedAt,
         r.patient_name AS patientName, r.ward, r.notes
  FROM blood_requests r JOIN hospitals h ON h.id = r.hospital_id`;

async function getHospitalId(userId) {
  const [h] = await pool.query("SELECT id FROM hospitals WHERE user_id = ?", [userId]);
  return h[0]?.id || null;
}

// ── GET /api/requests ── all requests (admin / overview) ──────────────────────
router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, group } = req.query;
    let sql = SELECT_LIST;
    const params = [];
    const where = [];
    if (status && STATUSES.includes(status)) { where.push("r.status = ?"); params.push(status); }
    if (group && BLOOD_GROUPS.includes(group)) { where.push("r.blood_group = ?"); params.push(group); }
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY r.raised_at DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("requests/list:", err.message);
    res.status(500).json({ error: "Couldn't load requests." });
  }
});

// ── GET /api/requests/mine ── logged-in hospital's own requests ───────────────
router.get("/mine", requireRole("hospital"), async (req, res) => {
  try {
    const hospitalId = await getHospitalId(req.user.id);
    if (!hospitalId) return res.status(404).json({ error: "Hospital profile not found." });
    const [rows] = await pool.query(SELECT_LIST + " WHERE r.hospital_id = ? ORDER BY r.raised_at DESC", [hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error("requests/mine:", err.message);
    res.status(500).json({ error: "Couldn't load your requests." });
  }
});

// ── POST /api/requests ── hospital raises a request ──────────────────────────
router.post("/", requireRole("hospital", "admin"), async (req, res) => {
  const { bloodGroup, units, urgency, patientName, ward, notes, hospitalId } = req.body;
  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    return res.status(400).json({ error: "A valid blood group is required." });
  }
  const unitsNeeded = Number(units);
  if (!Number.isInteger(unitsNeeded) || unitsNeeded < 1) {
    return res.status(400).json({ error: "Units must be a positive number." });
  }

  try {
    let hid = hospitalId;
    if (req.user.role === "hospital") {
      hid = await getHospitalId(req.user.id);
      if (!hid) return res.status(404).json({ error: "Hospital profile not found." });
    } else if (!hid) {
      return res.status(400).json({ error: "hospitalId is required." });
    }

    const conn = await pool.getConnection();
    let id;
    try {
      id = await nextId(conn, "REQ", "blood_requests");
      await conn.query(
        `INSERT INTO blood_requests (id, hospital_id, blood_group, units_needed, urgency, patient_name, ward, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, hid, bloodGroup, unitsNeeded, ["Routine", "Urgent", "Critical"].includes(urgency) ? urgency : "Routine",
         patientName || null, ward || null, notes || null]
      );
    } finally {
      conn.release();
    }

    // Critical requests automatically raise an admin alert (feeds the
    // emergency banner + Twilio SMS in phase 5).
    if (["Critical"].includes(req.body.urgency)) {
      const aconn = await pool.getConnection();
      try {
        const alertId = await nextId(aconn, "ALT", "alerts");
        const [[h]] = await aconn.query("SELECT name FROM hospitals WHERE id = ?", [hid]);
        await aconn.query(
          "INSERT INTO alerts (id, type, detail, severity) VALUES (?, 'Emergency request', ?, 'Critical')",
          [alertId, `${h?.name || "A hospital"} needs ${unitsNeeded} unit(s) of ${bloodGroup} — request ${id}.`]
        );
      } finally {
        aconn.release();
      }
    }

    const [rows] = await pool.query(SELECT_LIST + " WHERE r.id = ?", [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("requests/create:", err.message);
    res.status(500).json({ error: "Couldn't raise the request." });
  }
});

// ── GET /api/requests/:id/matches ── eligible donor matches ──────────────────
router.get("/:id/matches", requireAuth, async (req, res) => {
  try {
    const [r] = await pool.query(
      `SELECT r.blood_group AS bloodGroup, h.latitude AS h_lat, h.longitude AS h_lng
       FROM blood_requests r JOIN hospitals h ON h.id = r.hospital_id WHERE r.id = ?`,
      [req.params.id]
    );
    if (r.length === 0) return res.status(404).json({ error: "Request not found." });

    const donorGroups = CAN_RECEIVE_FROM[r[0].bloodGroup] || [];
    const [donors] = await pool.query(
      `SELECT d.id AS donorId, u.name, d.blood_group AS bloodGroup,
              d.latitude, d.longitude,
              DATE_FORMAT(d.last_donation_date, '%Y-%m-%d') AS lastDonation,
              (d.last_donation_date IS NULL OR d.last_donation_date <= CURDATE() - INTERVAL 90 DAY) AS eligible
       FROM donors d JOIN users u ON u.id = d.user_id
       WHERE d.blood_group IN (?)
       ORDER BY eligible DESC, d.last_donation_date ASC`,
      [donorGroups]
    );

    res.json(donors.map((x) => ({
      donorId: x.donorId,
      name: x.name,
      bloodGroup: x.bloodGroup,
      distanceKm: haversineKm(x.latitude, x.longitude, r[0].h_lat, r[0].h_lng),
      lastDonation: x.lastDonation,
      eligible: Boolean(x.eligible),
    })));
  } catch (err) {
    console.error("requests/matches:", err.message);
    res.status(500).json({ error: "Couldn't load donor matches." });
  }
});

// ── GET /api/requests/:id ── single request ───────────────────────────────────
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(SELECT_LIST + " WHERE r.id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Request not found." });
    res.json(rows[0]);
  } catch (err) {
    console.error("requests/one:", err.message);
    res.status(500).json({ error: "Couldn't load the request." });
  }
});

// ── PATCH /api/requests/:id/status ───────────────────────────────────────────
// Setting status to "Fulfilled" runs expiry-aware dispatch: oldest-expiring
// available batches are consumed first (FIFO by expiry).
router.patch("/:id/status", requireRole("admin", "hospital"), async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query("SELECT * FROM blood_requests WHERE id = ? FOR UPDATE", [req.params.id]);
    if (r.length === 0) { await conn.rollback(); return res.status(404).json({ error: "Request not found." }); }
    const request = r[0];

    if (status === "Fulfilled" && request.status !== "Fulfilled") {
      const remaining = request.units_needed - request.units_fulfilled;
      if (remaining > 0) {
        // Oldest-expiring first — the heart of expiry-aware stock control.
        const [batches] = await conn.query(
          `SELECT id, units FROM blood_batches
           WHERE blood_group = ? AND status = 'available' AND units > 0
           ORDER BY expiry_date ASC FOR UPDATE`,
          [request.blood_group]
        );
        let need = remaining;
        for (const b of batches) {
          if (need <= 0) break;
          const take = Math.min(b.units, need);
          const left = b.units - take;
          await conn.query(
            "UPDATE blood_batches SET units = ?, status = IF(? = 0, 'reserved', status) WHERE id = ?",
            [left, left, b.id]
          );
          need -= take;
        }
        if (need > 0) {
          await conn.rollback();
          return res.status(409).json({ error: `Only ${remaining - need} of ${remaining} units available in stock.` });
        }
      }
      await conn.query(
        "UPDATE blood_requests SET status = 'Fulfilled', units_fulfilled = units_needed, fulfilled_at = NOW() WHERE id = ?",
        [req.params.id]
      );
    } else {
      await conn.query("UPDATE blood_requests SET status = ? WHERE id = ?", [status, req.params.id]);
    }

    await conn.commit();
    const [rows] = await pool.query(SELECT_LIST + " WHERE r.id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error("requests/status:", err.message);
    res.status(500).json({ error: "Couldn't update the request." });
  } finally {
    conn.release();
  }
});

export default router;
