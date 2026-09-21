const { v4: uuid } = require("uuid");
const bcrypt = require("bcryptjs");
const { db } = require("../database");
const env = require("../config/env");

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    department: row.department,
    phone: row.phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Strips the password hash — use this for anything that leaves the server. */
function publicUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

const insertStmt = db.prepare(`
  INSERT INTO users (id, name, email, password, role, department, phone, created_at, updated_at)
  VALUES (@id, @name, @email, @password, @role, @department, @phone, @created_at, @updated_at)
`);

function create({ name, email, password, role, department, phone }) {
  const now = new Date().toISOString();
  const user = {
    id: uuid(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: bcrypt.hashSync(password, env.BCRYPT_ROUNDS),
    role,
    department: (department || "").trim(),
    phone: (phone || "").trim(),
    created_at: now,
    updated_at: now,
  };
  insertStmt.run(user);
  return toUser(user);
}

function findByEmail(email) {
  return toUser(
    db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").get((email || "").trim())
  );
}

function findById(id) {
  return toUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id));
}

function list({ search = "", role = "", page = 1, pageSize = 50 } = {}) {
  const where = [];
  const params = {};

  if (search) {
    where.push("(name LIKE @q OR email LIKE @q OR department LIKE @q)");
    params.q = `%${search}%`;
  }
  if (role) {
    where.push("role = @role");
    params.role = role;
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = db.prepare(`SELECT COUNT(*) AS n FROM users ${clause}`).get(params).n;

  const rows = db
    .prepare(
      `SELECT u.*,
              (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) AS booking_count
       FROM users u ${clause}
       ORDER BY datetime(u.created_at) DESC
       LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize });

  return {
    users: rows.map((row) => ({ ...publicUser(toUser(row)), bookingCount: row.booking_count })),
    total,
    page,
    pageSize,
  };
}

function updateProfile(id, { name, department, phone }) {
  db.prepare(
    `UPDATE users
     SET name = COALESCE(@name, name),
         department = COALESCE(@department, department),
         phone = COALESCE(@phone, phone),
         updated_at = @updated_at
     WHERE id = @id`
  ).run({
    id,
    name: name?.trim() ?? null,
    department: department?.trim() ?? null,
    phone: phone?.trim() ?? null,
    updated_at: new Date().toISOString(),
  });
  return findById(id);
}

function updatePassword(id, newPassword) {
  db.prepare("UPDATE users SET password = ?, updated_at = ? WHERE id = ?").run(
    bcrypt.hashSync(newPassword, env.BCRYPT_ROUNDS),
    new Date().toISOString(),
    id
  );
}

function remove(id) {
  return db.prepare("DELETE FROM users WHERE id = ?").run(id).changes > 0;
}

function count() {
  return db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
}

module.exports = {
  create,
  findByEmail,
  findById,
  list,
  updateProfile,
  updatePassword,
  remove,
  count,
  publicUser,
};
