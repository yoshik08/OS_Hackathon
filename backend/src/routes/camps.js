import express from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { nextId } from "../utils/ids.js";

const router = express.Router();
const STATUSES = ["Upcoming", "Ongoing", "Completed", "Cancelled"];

const SELECT = `
  SELECT id, name, location, organizer,
         DATE_FORMAT(camp_date, '%Y-%m-%d') AS date,
         time_slot AS time, status,
         expected_donors AS expectedDonors, units_collected AS unitsCollected,
         contact_phone AS contactPhone
  FROM camps`;

// ── GET /api/camps ── public (donors browse camps without signing in) ──────────
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    let sql = SELECT;
    const params = [];
    if (status && STATUSES.includes(status)) { sql += " WHERE status = ?"; params.push(status); }
    sql += " ORDER BY camp_date DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("camps/list:", err.message);
    res.status(500).json({ error: "Couldn't load camps." });
  }
});

// ── POST /api/camps ── admin creates a camp ───────────────────────────────────
router.post("/", requireRole("admin"), async (req, res) => {
  const { name, location, organizer, date, time, expectedDonors, contactPhone } = req.body;
  if (!name || !location || !date) {
    return res.status(400).json({ error: "Name, location and date are required." });
  }
  const conn = await pool.getConnection();
  try {
    const id = await nextId(conn, "CAMP", "camps");
    await conn.query(
      `INSERT INTO camps (id, name, location, organizer, camp_date, time_slot, status, expected_donors, contact_phone)
       VALUES (?, ?, ?, ?, ?, ?, 'Upcoming', ?, ?)`,
      [id, name, location, organizer || null, date, time || null,
       expectedDonors ? Number(expectedDonors) : null, contactPhone || null]
    );
    conn.release();
    const [rows] = await pool.query(SELECT + " WHERE id = ?", [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    conn.release();
    console.error("camps/create:", err.message);
    res.status(500).json({ error: "Couldn't create the camp." });
  }
});

// ── PATCH /api/camps/:id ── admin updates a camp ─────────────────────────────
router.patch("/:id", requireRole("admin"), async (req, res) => {
  const allowed = ["name", "location", "organizer", "camp_date", "time_slot", "status", "expected_donors", "units_collected", "contact_phone"];
  if (req.body.status && !STATUSES.includes(req.body.status)) {
    return res.status(400).json({ error: "Invalid status." });
  }
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update." });
  try {
    const set = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
    const [r] = await pool.query(`UPDATE camps SET ${set} WHERE id = ?`, [...Object.values(updates), req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: "Camp not found." });
    const [rows] = await pool.query(SELECT + " WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error("camps/patch:", err.message);
    res.status(500).json({ error: "Couldn't update the camp." });
  }
});

export default router;
