import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Railway-style DATABASE_URL (mysql://user:pass@host:port/db) takes
// precedence; otherwise fall back to the individual DB_* variables.
const poolConfig = process.env.DATABASE_URL
  ? { uri: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "raktasetu",
    };

export const pool = mysql.createPool({
  ...poolConfig,
  waitForConnections: true,
  connectionLimit: 10,
  // Return DATE/DATETIME as strings so the API can format them exactly
  // like the frontend already expects ("2025-09-11", "2025-09-11T08:40:00").
  dateStrings: true,
});

// Fail fast with a helpful message if MySQL isn't reachable.
export async function checkDb() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}
