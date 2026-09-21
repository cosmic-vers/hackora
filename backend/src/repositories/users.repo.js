const { query } = require("../database");
const env = require("../config/env");

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    organization: row.organization || "",
    phone: row.phone || "",
    avatarUrl: row.avatar_url || "",
    authProvider: row.auth_provider || "google",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function publicUser(user) {
  return user ? { ...user } : null;
}

async function upsertFromIdentity(identity) {
  const email = String(identity.email || "").trim().toLowerCase();
  if (!email) throw new Error("Your Google account did not provide an email address.");

  const existing = await findById(identity.id);
  const metadata = identity.user_metadata || {};
  const name = String(metadata.full_name || metadata.name || identity.email.split("@")[0]).trim() || "User";
  const avatarUrl = String(metadata.avatar_url || metadata.picture || "").trim();
  const adminEmail = env.ADMIN_EMAILS.some((item) => item.toLowerCase() === email);

  let role = existing?.role || "CUSTOMER";
  if (adminEmail) role = "ADMIN";

  const { rows } = await query(
    `INSERT INTO users (id, name, email, role, organization, phone, avatar_url, auth_provider)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'google')
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       email = EXCLUDED.email,
       avatar_url = EXCLUDED.avatar_url,
       auth_provider = 'google',
       role = CASE WHEN users.role = 'ADMIN' OR EXCLUDED.role = 'ADMIN' THEN 'ADMIN' ELSE users.role END,
       updated_at = now()
     RETURNING *`,
    [identity.id, name, email, role, existing?.organization || "", existing?.phone || "", avatarUrl]
  );
  return toUser(rows[0]);
}

async function findById(id) {
  const { rows } = await query("SELECT * FROM users WHERE id = $1", [id]);
  return toUser(rows[0]);
}

async function findByEmail(email) {
  const { rows } = await query("SELECT * FROM users WHERE lower(email) = lower($1)", [String(email || "").trim()]);
  return toUser(rows[0]);
}

async function list({ search = "", role = "", page = 1, pageSize = 50 } = {}) {
  const where = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.organization ILIKE $${params.length})`);
  }
  if (role) {
    params.push(role);
    where.push(`u.role = $${params.length}`);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalResult = await query(`SELECT COUNT(*)::int AS n FROM users u ${clause}`, params);
  params.push(pageSize, (page - 1) * pageSize);
  const { rows } = await query(
    `SELECT u.*, (SELECT COUNT(*)::int FROM bookings b WHERE b.user_id=u.id) AS booking_count
     FROM users u ${clause}
     ORDER BY u.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return {
    users: rows.map((row) => ({ ...publicUser(toUser(row)), bookingCount: Number(row.booking_count || 0) })),
    total: Number(totalResult.rows[0]?.n || 0),
    page,
    pageSize,
  };
}

async function updateProfile(id, { name, organization, phone }) {
  const { rows } = await query(
    `UPDATE users SET
       name = COALESCE($1,name),
       organization = COALESCE($2,organization),
       phone = COALESCE($3,phone)
     WHERE id = $4
     RETURNING *`,
    [name?.trim() || null, organization?.trim() ?? null, phone?.trim() ?? null, id]
  );
  return toUser(rows[0]);
}

async function remove(id) {
  const result = await query("DELETE FROM users WHERE id=$1", [id]);
  return result.rowCount > 0;
}

async function updateRole(id, role) {
  const allowed = ["CUSTOMER", "VENUE_OWNER", "ADMIN"];
  if (!allowed.includes(role)) throw new Error("Invalid role.");
  const { rows } = await query("UPDATE users SET role=$1,updated_at=now() WHERE id=$2 RETURNING *", [role, id]);
  return toUser(rows[0]);
}

async function count() {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM users");
  return Number(rows[0]?.n || 0);
}

module.exports = { upsertFromIdentity, findById, findByEmail, list, updateProfile, updateRole, remove, count, publicUser };
