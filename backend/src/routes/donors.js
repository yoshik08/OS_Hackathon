import express from "express";
import { pool } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { haversineKm } from "../utils/geo.js";

const router = express.Router();
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
// Donor's blood group -> recipient groups they can donate to.
const CAN_DONATE_TO = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};
const URGENCY_RANK = { Critical: 0, Urgent: 1, Routine: 2 };

router.use(requireRole("donor", "admin"));

async function getDonor(userId) {
  const [d] = await pool.query(
    `SELECT d.*, u.name FROM donors d JOIN users u ON u.id = d.user_id WHERE d.user_id = ?`,
    [userId]
  );
  return d[0] || null;
}

// ── GET /api/donors/me ── currentDonor shape ──────────────────────────────────
router.get("/me", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id, u.name, d.blood_group AS bloodGroup, d.phone,
              DATE_FORMAT(d.last_donation_date, '%Y-%m-%d') AS lastDonation,
              -- whole-blood donors become eligible again after ~90 days
              DATE_FORMAT(DATE_ADD(d.last_donation_date, INTERVAL 90 DAY), '%Y-%m-%d') AS eligibleFrom,
              d.total_donations AS totalDonations, d.city
       FROM donors d JOIN users u ON u.id = d.user_id
       WHERE d.user_id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Donor profile not found." });
    res.json(rows[0]);
  } catch (err) {
    console.error("donors/me:", err.message);
    res.status(500).json({ error: "Couldn't load your profile." });
  }
});

// ── GET /api/donors/me/history ── donationHistory shape ──────────────────────
router.get("/me/history", async (req, res) => {
  try {
    const d = await getDonor(req.user.id);
    if (!d) return res.status(404).json({ error: "Donor profile not found." });
    const [rows] = await pool.query(
      `SELECT id, DATE_FORMAT(donation_date, '%Y-%m-%d') AS date, location, units, status
       FROM donations WHERE donor_id = ? ORDER BY donation_date DESC`,
      [d.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("donors/history:", err.message);
    res.status(500).json({ error: "Couldn't load donation history." });
  }
});

// Open requests the donor's blood can fulfil, nearest + most urgent first.
async function getNearbyRequests(donor) {
  const groups = CAN_DONATE_TO[donor.blood_group] || [];
  const [rows] = await pool.query(
    `SELECT r.id, h.name AS hospital, h.location AS hospital_location,
            h.latitude AS h_lat, h.longitude AS h_lng,
            r.blood_group AS bloodGroup, r.urgency,
            (r.units_needed - r.units_fulfilled) AS unitsNeeded,
            DATE_FORMAT(r.raised_at, '%Y-%m-%dT%H:%i:%s') AS postedAt
     FROM blood_requests r
     JOIN hospitals h ON h.id = r.hospital_id
     WHERE r.status IN ('Pending','Matching') AND r.blood_group IN (?)
     ORDER BY r.raised_at DESC`,
    [groups]
  );

  const withDistance = rows.map((r) => ({
    id: r.id,
    hospital: r.hospital_location ? `${r.hospital}, ${r.hospital_location}` : r.hospital,
    bloodGroup: r.bloodGroup,
    urgency: r.urgency,
    distanceKm: haversineKm(donor.latitude, donor.longitude, r.h_lat, r.h_lng),
    unitsNeeded: r.unitsNeeded,
    postedAt: r.postedAt,
  }));

  withDistance.sort(
    (a, b) =>
      URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
      (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)
  );
  return withDistance;
}

// ── GET /api/donors/me/nearby-requests ───────────────────────────────────────
router.get("/me/nearby-requests", async (req, res) => {
  try {
    const d = await getDonor(req.user.id);
    if (!d) return res.status(404).json({ error: "Donor profile not found." });
    res.json(await getNearbyRequests(d));
  } catch (err) {
    console.error("donors/nearby:", err.message);
    res.status(500).json({ error: "Couldn't load nearby requests." });
  }
});

// ── GET /api/donors/me/match-alerts ── top 2 for the donor dashboard ──────────
router.get("/me/match-alerts", async (req, res) => {
  try {
    const d = await getDonor(req.user.id);
    if (!d) return res.status(404).json({ error: "Donor profile not found." });
    res.json((await getNearbyRequests(d)).slice(0, 2));
  } catch (err) {
    console.error("donors/alerts:", err.message);
    res.status(500).json({ error: "Couldn't load match alerts." });
  }
});

// ── PATCH /api/donors/me ── update own profile ───────────────────────────────
router.patch("/me", async (req, res) => {
  // API field → column mapping (bloodGroup is the camelCase alias clients use).
  const fieldMap = { phone: "phone", city: "city", bloodGroup: "blood_group" };
  if (req.body.bloodGroup && !BLOOD_GROUPS.includes(req.body.bloodGroup)) {
    return res.status(400).json({ error: "Invalid blood group." });
  }
  const updates = Object.fromEntries(
    Object.entries(req.body)
      .filter(([k, v]) => fieldMap[k] && v !== undefined && v !== "")
      .map(([k, v]) => [fieldMap[k], v])
  );
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Nothing to update." });
  }
  try {
    const d = await getDonor(req.user.id);
    if (!d) return res.status(404).json({ error: "Donor profile not found." });
    const set = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
    await pool.query(`UPDATE donors SET ${set} WHERE id = ?`, [...Object.values(updates), d.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("donors/patch:", err.message);
    res.status(500).json({ error: "Couldn't update your profile." });
  }
});

export default router;
