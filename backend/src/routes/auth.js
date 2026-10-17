import express from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { nextId, nextIdPool } from "../utils/ids.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { HYDERABAD_CENTER } from "../utils/geo.js";

const router = express.Router();
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// ── POST /api/auth/register ──────────────────────────────────────────────────
// Body for donors:   { name, email, password, role:"donor", bloodGroup, city?, phone?, dateOfBirth?, username? }
// Body for hospitals:{ name, email, password, role:"hospital", hospitalName, location?, phone? }
// Body for admins:   { name, email, password, role:"admin", username? }
router.post("/register", async (req, res) => {
  const { name, email, username, password, role } = req.body;

  if (!name || !email || !password || !["donor", "hospital", "admin"].includes(role)) {
    return res.status(400).json({ error: "Name, email, password and a valid role are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  if (role === "donor" && !BLOOD_GROUPS.includes(req.body.bloodGroup)) {
    return res.status(400).json({ error: "A valid blood group is required for donors." });
  }
  if (role === "hospital" && !req.body.hospitalName) {
    return res.status(400).json({ error: "Hospital name is required." });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      "SELECT id FROM users WHERE email = ? OR (username IS NOT NULL AND username = ?)",
      [email, username || null]
    );
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: "An account with this email or username already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [u] = await conn.query(
      "INSERT INTO users (name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [name, email, username || null, passwordHash, role]
    );
    const userId = u.insertId;
    let profileId = null;

    if (role === "donor") {
      profileId = await nextId(conn, "DNR", "donors");
      const city = req.body.city || null;
      const isHyd = city && city.toLowerCase().includes("hyderabad");
      await conn.query(
        `INSERT INTO donors (id, user_id, blood_group, city, phone, date_of_birth, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [profileId, userId, req.body.bloodGroup, city, req.body.phone || null,
         req.body.dateOfBirth || null,
         isHyd ? HYDERABAD_CENTER.lat : null, isHyd ? HYDERABAD_CENTER.lng : null]
      );
    } else if (role === "hospital") {
      profileId = await nextId(conn, "HSP", "hospitals");
      await conn.query(
        "INSERT INTO hospitals (id, user_id, name, location, phone) VALUES (?, ?, ?, ?, ?)",
        [profileId, userId, req.body.hospitalName, req.body.location || null, req.body.phone || null]
      );
    }

    await conn.commit();
    const token = signToken({ id: userId, role, name });
    res.status(201).json({ token, user: { id: userId, name, email, role, profileId } });
  } catch (err) {
    await conn.rollback();
    console.error("register:", err.message);
    res.status(500).json({ error: "Couldn't create the account. Please try again." });
  } finally {
    conn.release();
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
// Body: { identifier, password, role }
//   donor/admin → identifier is email or username
//   hospital    → identifier is the Hospital ID, e.g. "HSP-1024"
router.post("/login", async (req, res) => {
  const { identifier, password, role } = req.body;
  if (!identifier || !password || !role) {
    return res.status(400).json({ error: "ID, password and role are required." });
  }

  try {
    let user = null;
    let profileId = null;

    if (role === "hospital") {
      const [h] = await pool.query("SELECT id, user_id FROM hospitals WHERE id = ?", [identifier.trim()]);
      if (h.length === 0 || !h[0].user_id) {
        return res.status(401).json({ error: "Hospital ID or password is incorrect." });
      }
      profileId = h[0].id;
      const [u] = await pool.query("SELECT * FROM users WHERE id = ?", [h[0].user_id]);
      user = u[0];
    } else {
      const [u] = await pool.query(
        "SELECT * FROM users WHERE (email = ? OR username = ?) AND role = ?",
        [identifier.trim(), identifier.trim(), role]
      );
      user = u[0];
      if (user && role === "donor") {
        const [d] = await pool.query("SELECT id FROM donors WHERE user_id = ?", [user.id]);
        profileId = d[0]?.id || null;
      }
    }

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "ID or password is incorrect." });
    }
    if (user.role !== role) {
      return res.status(401).json({ error: "This account isn't registered for that role." });
    }

    const token = signToken({ id: user.id, role: user.role, name: user.name });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, profileId },
    });
  } catch (err) {
    console.error("login:", err.message);
    res.status(500).json({ error: "Couldn't sign you in. Please try again." });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [u] = await pool.query("SELECT id, name, email, role, created_at FROM users WHERE id = ?", [req.user.id]);
    if (u.length === 0) return res.status(404).json({ error: "Account not found." });
    const user = u[0];
    let profile = null;
    if (user.role === "donor") {
      const [d] = await pool.query("SELECT * FROM donors WHERE user_id = ?", [user.id]);
      profile = d[0] || null;
    } else if (user.role === "hospital") {
      const [h] = await pool.query("SELECT * FROM hospitals WHERE user_id = ?", [user.id]);
      profile = h[0] || null;
    }
    res.json({ ...user, profile });
  } catch (err) {
    console.error("me:", err.message);
    res.status(500).json({ error: "Couldn't load your profile." });
  }
});

export default router;
