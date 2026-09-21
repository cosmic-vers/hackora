const { v4: uuid } = require("uuid");
const { db } = require("../database");

function toNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    read: row.is_read === 1,
    createdAt: row.created_at,
  };
}

const insertStmt = db.prepare(`
  INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
  VALUES (@id, @user_id, @type, @title, @message, @link, 0, @created_at)
`);

/** Safe to call inside an open transaction. */
function create({ userId, type = "INFO", title, message = "", link = "" }) {
  const row = {
    id: uuid(),
    user_id: userId,
    type,
    title,
    message,
    link,
    created_at: new Date().toISOString(),
  };
  insertStmt.run(row);
  return toNotification({ ...row, is_read: 0 });
}

function listForUser(userId, { limit = 30 } = {}) {
  const rows = db
    .prepare(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY datetime(created_at) DESC
       LIMIT ?`
    )
    .all(userId, limit);
  const unread = db
    .prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0")
    .get(userId).n;
  return { notifications: rows.map(toNotification), unread };
}

function markRead(userId, id) {
  return (
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?").run(id, userId)
      .changes > 0
  );
}

function markAllRead(userId) {
  return db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(userId).changes;
}

function clear(userId) {
  return db.prepare("DELETE FROM notifications WHERE user_id = ?").run(userId).changes;
}

/** Every admin gets told when a new request lands. */
function notifyAdmins(payload) {
  const admins = db.prepare("SELECT id FROM users WHERE role = 'ADMIN'").all();
  admins.forEach((admin) => create({ ...payload, userId: admin.id }));
  return admins.length;
}

module.exports = { create, listForUser, markRead, markAllRead, clear, notifyAdmins };
