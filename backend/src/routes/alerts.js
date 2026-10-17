import express from "express";
import { pool } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { nextId } from "../utils/ids.js";

const router = express.Router();
router.use(requireRole("admin", "hospital"));

const SELECT = `
  SELECT id, type, detail, severity,
         DATE_FORMAT(raised_at, '%Y-%m-%dT%H:%i:%s') AS raisedAt,
         is_resolved AS isResolved,
         DATE_FORMAT(resolved_at, '%Y-%m-%dT%H:%i:%s') AS resolvedAt
  FROM alerts`;

// ── GET /api/alerts ── unresolved by default; ?all=1 for everything ──────────
router.get("/", async (req, res) => {
  try {
    const sql = SELECT + (req.query.all ? "" : " WHERE is_resolved = FALSE") + " ORDER BY raised_at DESC";
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("alerts/list:", err.message);
    res.status(500).json({ error: "Couldn't load alerts." });
  }
});

// ── POST /api/alerts ────────────────────────────────────────────────────────
router.post("/", requireRole("admin"), async (req, res) => {
  const { type, detail, severity } = req.body;
  if (!type || !detail) return res.status(400).json({ error: "Type and detail are required." });
  const conn = await pool.getConnection();
  try {
    const id = await nextId(conn, "ALT", "alerts");
    await conn.query(
      "INSERT INTO alerts (id, type, detail, severity) VALUES (?, ?, ?, ?)",
      [id, type, detail, ["Info", "Warning", "Critical"].includes(severity) ? severity : "Info"]
    );
    conn.release();
    const [rows] = await pool.query(SELECT + " WHERE id = ?", [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    conn.release();
    console.error("alerts/create:", err.message);
    res.status(500).json({ error: "Couldn't raise the alert." });
  }
});

// ── PATCH /api/alerts/:id/resolve ────────────────────────────────────────────
router.patch("/:id/resolve", requireRole("admin"), async (req, res) => {
  try {
    const [r] = await pool.query(
      "UPDATE alerts SET is_resolved = TRUE, resolved_at = NOW() WHERE id = ?",
      [req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: "Alert not found." });
    res.json({ ok: true });
  } catch (err) {
    console.error("alerts/resolve:", err.message);
    res.status(500).json({ error: "Couldn't resolve the alert." });
  }
});

export default router;
