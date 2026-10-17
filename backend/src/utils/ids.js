import { pool } from "../db.js";

/**
 * Generate the next display ID for a table, e.g. ("DNR", "donors") -> "DNR-1043".
 * Reads MAX(numeric suffix) so it keeps working after seed data is loaded.
 */
export async function nextId(conn, prefix, table) {
  const [rows] = await conn.query(
    `SELECT MAX(CAST(SUBSTRING(id, ?) AS UNSIGNED)) AS max_n FROM \`${table}\` WHERE id LIKE ?`,
    [prefix.length + 2, `${prefix}-%`]
  );
  const n = rows[0].max_n == null ? 1 : Number(rows[0].max_n) + 1;
  return `${prefix}-${n}`;
}

/** Same as nextId but using the shared pool (for single-query routes). */
export async function nextIdPool(prefix, table) {
  const conn = await pool.getConnection();
  try {
    return await nextId(conn, prefix, table);
  } finally {
    conn.release();
  }
}
