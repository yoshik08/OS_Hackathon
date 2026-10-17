import express from "express";
import { pool } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { nextId } from "../utils/ids.js";

const router = express.Router();
router.use(requireRole("admin"));

const SELECT = `
  SELECT id, donor_id AS donorId, donor_name AS donorName, donor_group AS donorGroup,
         recipient_name AS recipientName, recipient_group AS recipientGroup,
         abo_compat AS aboCompat, rh_compat AS rhCompat,
         antibody_screen AS antibodyScreen, result AS crossMatchResult,
         tested_by AS testedBy,
         DATE_FORMAT(tested_at, '%Y-%m-%dT%H:%i:%s') AS testedAt,
         request_id AS requestId
  FROM crossmatch_records`;

// ── GET /api/crossmatch ──────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { requestId } = req.query;
    let sql = SELECT;
    const params = [];
    if (requestId) { sql += " WHERE request_id = ?"; params.push(requestId); }
    sql += " ORDER BY tested_at DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("crossmatch/list:", err.message);
    res.status(500).json({ error: "Couldn't load cross-match records." });
  }
});

// ── POST /api/crossmatch ─────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { donorId, donorName, donorGroup, recipientName, recipientGroup,
          aboCompat, rhCompat, antibodyScreen, result, testedBy, requestId } = req.body;
  const groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  if (!["Compatible", "Incompatible"].includes(result)) {
    return res.status(400).json({ error: "Result must be Compatible or Incompatible." });
  }
  if (donorGroup && !groups.includes(donorGroup)) {
    return res.status(400).json({ error: "Invalid donor blood group." });
  }
  if (recipientGroup && !groups.includes(recipientGroup)) {
    return res.status(400).json({ error: "Invalid recipient blood group." });
  }
  const conn = await pool.getConnection();
  try {
    const id = await nextId(conn, "CM", "crossmatch_records");
    await conn.query(
      `INSERT INTO crossmatch_records
         (id, donor_id, donor_name, donor_group, recipient_name, recipient_group,
          abo_compat, rh_compat, antibody_screen, result, tested_by, request_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, donorId || null, donorName || null, donorGroup || null,
       recipientName || null, recipientGroup || null,
       aboCompat || null, rhCompat || null, antibodyScreen || null,
       result, testedBy || null, requestId || null]
    );
    conn.release();
    const [rows] = await pool.query(SELECT + " WHERE id = ?", [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    conn.release();
    console.error("crossmatch/create:", err.message);
    res.status(500).json({ error: "Couldn't save the cross-match record." });
  }
});

export default router;
