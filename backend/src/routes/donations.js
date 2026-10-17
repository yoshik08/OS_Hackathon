import express from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { nextId } from "../utils/ids.js";

const router = express.Router();

// ── GET /api/donations ── all donations (admin) ──────────────────────────────
router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT dn.id, dn.donor_id AS donorId, u.name AS donorName,
              DATE_FORMAT(dn.donation_date, '%Y-%m-%d') AS date,
              dn.location, dn.units, dn.status
       FROM donations dn JOIN donors d ON d.id = dn.donor_id
       JOIN users u ON u.id = d.user_id
       ORDER BY dn.donation_date DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    console.error("donations/list:", err.message);
    res.status(500).json({ error: "Couldn't load donations." });
  }
});

// ── POST /api/donations ── record a donation ─────────────────────────────────
// One call does the whole real-world flow in a transaction:
//   donation row -> expiry-aware stock batch (42-day shelf life)
//   -> donor's last_donation_date + total_donations updated.
router.post("/", requireAuth, async (req, res) => {
  let { donorId, date, location, units } = req.body;

  if (req.user.role === "donor") {
    const [d] = await pool.query("SELECT id FROM donors WHERE user_id = ?", [req.user.id]);
    if (!d[0]) return res.status(404).json({ error: "Donor profile not found." });
    donorId = d[0].id; // donors can only record their own donations
  }
  if (!donorId) return res.status(400).json({ error: "donorId is required." });
  const n = Number(units || 1);
  if (!Number.isInteger(n) || n < 1) {
    return res.status(400).json({ error: "Units must be a positive number." });
  }
  const donationDate = date || new Date().toISOString().slice(0, 10);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [d] = await conn.query("SELECT id FROM donors WHERE id = ? FOR UPDATE", [donorId]);
    if (d.length === 0) { await conn.rollback(); return res.status(404).json({ error: "Donor not found." }); }

    const [ins] = await conn.query(
      `INSERT INTO donations (donor_id, donation_date, location, units, status)
       VALUES (?, ?, ?, ?, 'Completed')`,
      [donorId, donationDate, location || null, n]
    );

    const batchId = await nextId(conn, "BAT", "blood_batches");
    const [dg] = await conn.query("SELECT blood_group FROM donors WHERE id = ?", [donorId]);
    await conn.query(
      `INSERT INTO blood_batches (id, blood_group, units, collected_date, expiry_date, status, source_type, source_id)
       VALUES (?, ?, ?, ?, DATE_ADD(?, INTERVAL 42 DAY), 'available', 'donation', ?)`,
      [batchId, dg[0].blood_group, n, donationDate, donationDate, String(ins.insertId)]
    );

    await conn.query(
      `UPDATE donors SET last_donation_date = GREATEST(COALESCE(last_donation_date, '1900-01-01'), ?),
                         total_donations = total_donations + ? WHERE id = ?`,
      [donationDate, n, donorId]
    );

    await conn.commit();
    res.status(201).json({ ok: true, donationId: ins.insertId, batchId });
  } catch (err) {
    await conn.rollback();
    console.error("donations/create:", err.message);
    res.status(500).json({ error: "Couldn't record the donation." });
  } finally {
    conn.release();
  }
});

export default router;
