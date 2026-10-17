import express from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { nextId } from "../utils/ids.js";

const router = express.Router();
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// All 8 groups, even ones with zero stock (the UI renders every row).
const INVENTORY_SQL = `
  SELECT g.bloodGroup,
         COALESCE(v.units, 0) AS units,
         COALESCE(v.near_expiry_units, 0) AS nearExpiryUnits,
         DATE_FORMAT(v.earliest_expiry, '%Y-%m-%d') AS earliestExpiry
  FROM (SELECT 'A+' AS bloodGroup UNION ALL SELECT 'A-' UNION ALL SELECT 'B+'
        UNION ALL SELECT 'B-' UNION ALL SELECT 'AB+' UNION ALL SELECT 'AB-'
        UNION ALL SELECT 'O+' UNION ALL SELECT 'O-') g
  LEFT JOIN v_inventory v ON v.blood_group = g.bloodGroup
  ORDER BY FIELD(g.bloodGroup, 'A+','A-','B+','B-','AB+','AB-','O+','O-')`;

// ── GET /api/inventory ── public (the landing page shows live stock) ──────────
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(INVENTORY_SQL);
    res.json(rows);
  } catch (err) {
    console.error("inventory:", err.message);
    res.status(500).json({ error: "Couldn't load inventory." });
  }
});

// ── GET /api/inventory/batches ── batch-level detail (admin) ──────────────────
router.get("/batches", requireRole("admin"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, blood_group AS bloodGroup, units,
              DATE_FORMAT(collected_date, '%Y-%m-%d') AS collectedDate,
              DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiryDate,
              status, source_type AS sourceType, source_id AS sourceId
       FROM blood_batches ORDER BY expiry_date ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error("inventory/batches:", err.message);
    res.status(500).json({ error: "Couldn't load stock batches." });
  }
});

// ── POST /api/inventory/batches ── admin restocks (adds a batch) ─────────────
router.post("/batches", requireRole("admin"), async (req, res) => {
  const { bloodGroup, units, collectedDate } = req.body;
  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    return res.status(400).json({ error: "A valid blood group is required." });
  }
  const n = Number(units);
  if (!Number.isInteger(n) || n < 1) {
    return res.status(400).json({ error: "Units must be a positive number." });
  }
  const collected = collectedDate || new Date().toISOString().slice(0, 10);

  const conn = await pool.getConnection();
  try {
    const id = await nextId(conn, "BAT", "blood_batches");
    // Whole blood shelf life ~= 42 days.
    await conn.query(
      `INSERT INTO blood_batches (id, blood_group, units, collected_date, expiry_date, status, source_type)
       VALUES (?, ?, ?, ?, DATE_ADD(?, INTERVAL 42 DAY), 'available', 'donation')`,
      [id, bloodGroup, n, collected, collected]
    );
    conn.release();
    const [rows] = await pool.query(
      `SELECT id, blood_group AS bloodGroup, units,
              DATE_FORMAT(collected_date, '%Y-%m-%d') AS collectedDate,
              DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiryDate, status
       FROM blood_batches WHERE id = ?`,
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    conn.release();
    console.error("inventory/restock:", err.message);
    res.status(500).json({ error: "Couldn't add stock." });
  }
});

export default router;
