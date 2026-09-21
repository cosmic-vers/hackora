const fs = require("fs");
const path = require("path");
const { Pool, types } = require("pg");
const env = require("../config/env");

// node-postgres returns DATE columns (oid 1082) as JS Date objects by
// default. Every booking/block/contract date in this app is a plain
// calendar date with no time component, and the rest of the codebase
// treats it as a "YYYY-MM-DD" string (e.g. `String(v).slice(0, 10)` in the
// repositories). Left as a Date object, that slice instead produces
// something like "Fri Jan 15" — which silently corrupts every date shown
// to the frontend, and makes booking approval hard-fail (it re-sends that
// mangled value into a follow-up query, which Postgres then rejects as an
// invalid date). Keep the raw "YYYY-MM-DD" string Postgres sends on the wire.
types.setTypeParser(1082, (val) => val);

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Create a Supabase/Postgres project and add its connection string to backend/.env.");
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  // Safety net: a query that gets stuck (lock contention, a bad plan, a
  // network blip to Supabase) should fail loudly instead of holding a
  // connection — and the request that's waiting on it — forever.
  statement_timeout: 20_000,
  query_timeout: 20_000,
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
  const migrationsDir = path.join(__dirname, "../../../supabase/migrations");
  const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
  }
  console.log("[db] PostgreSQL schema and migrations ready.");
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, withTransaction, initSchema, close };
