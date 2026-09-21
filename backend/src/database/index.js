const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const env = require("../config/env");

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Create a Supabase/Postgres project and add its connection string to backend/.env.");
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: env.isProduction || env.DATABASE_URL.includes("supabase.co")
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on("error", (error) => {
  console.error("[db] unexpected idle client error", error);
});

async function query(text, params = [], client = pool) {
  return client.query(text, params);
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw error;
  } finally {
    client.release();
  }
}

async function initSchema() {
  const schemaPath = path.join(__dirname, "../../../supabase/schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schema);
  console.log("[db] PostgreSQL schema ready.");
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, withTransaction, initSchema, close };
