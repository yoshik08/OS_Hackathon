import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import { checkDb } from "./db.js";
import authRoutes from "./routes/auth.js";
import donorRoutes from "./routes/donors.js";
import requestRoutes from "./routes/requests.js";
import inventoryRoutes from "./routes/inventory.js";
import donationRoutes from "./routes/donations.js";
import campRoutes from "./routes/camps.js";
import crossmatchRoutes from "./routes/crossmatch.js";
import alertRoutes from "./routes/alerts.js";
import adminRoutes from "./routes/admin.js";
import metaRoutes from "./routes/meta.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Local dev origins always allowed; add deployed frontend(s) via FRONTEND_URL
// (comma-separated, e.g. "https://raktasetu.vercel.app").
const extraOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173", ...extraOrigins] })
);
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true, service: "raktasetu-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/camps", campRoutes);
app.use("/api/crossmatch", crossmatchRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/meta", metaRoutes);

app.use("/api", (req, res) => res.status(404).json({ error: "Unknown API endpoint." }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("unhandled:", err.message);
  res.status(500).json({ error: "Something went wrong." });
});

async function start() {
  try {
    await checkDb();
    console.log("✓ Connected to MySQL");
  } catch (err) {
    console.error(
      "✗ Cannot reach MySQL — is the server running, and is your .env correct? " +
        "(uses DATABASE_URL when set, otherwise DB_HOST/DB_PORT)"
    );
    console.error(`  (${err.message})`);
    process.exit(1);
  }
  app.listen(PORT, () => console.log(`✓ RaktaSetu API listening on http://localhost:${PORT}`));
}

start();
