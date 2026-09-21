/**
 * Imports data written by the previous JSON-file store (backend/data/*.json)
 * into SQLite. Runs once: after a successful import the old files are renamed
 * with a .imported suffix so they are never applied twice.
 */
const fs = require("fs");
const path = require("path");
const { db, transaction } = require("./index");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const LEGACY = {
  users: path.join(DATA_DIR, "users.json"),
  venues: path.join(DATA_DIR, "venues.json"),
  bookings: path.join(DATA_DIR, "bookings.json"),
};

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn(`[migrate] ${path.basename(file)} is not valid JSON — skipping it.`);
    return null;
  }
}

function migrateFromJson() {
  const users = readJson(LEGACY.users);
  const venues = readJson(LEGACY.venues);
  const bookings = readJson(LEGACY.bookings);

  if (!users && !venues && !bookings) return { imported: false };

  const existing = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  if (existing > 0) return { imported: false, reason: "database already has data" };

  const now = new Date().toISOString();
  const counts = { users: 0, venues: 0, bookings: 0 };

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, password, role, department, phone, created_at, updated_at)
    VALUES (@id, @name, @email, @password, @role, @department, @phone, @created_at, @updated_at)
  `);
  const insertVenue = db.prepare(`
    INSERT OR IGNORE INTO venues
      (id, name, type, location, capacity, amenities, description, image, status, open_time, close_time, created_at, updated_at)
    VALUES
      (@id, @name, @type, @location, @capacity, @amenities, @description, @image, @status, @open_time, @close_time, @created_at, @updated_at)
  `);
  const insertBooking = db.prepare(`
    INSERT OR IGNORE INTO bookings
      (id, venue_id, user_id, title, purpose, category, date, start_time, end_time,
       expected_attendees, status, admin_remarks, created_at, updated_at)
    VALUES
      (@id, @venue_id, @user_id, @title, @purpose, @category, @date, @start_time, @end_time,
       @expected_attendees, @status, @admin_remarks, @created_at, @updated_at)
  `);

  transaction(() => {
    (users || []).forEach((u) => {
      insertUser.run({
        id: u.id,
        name: u.name || "Unnamed",
        email: (u.email || "").toLowerCase(),
        password: u.password,
        role: u.role || "STUDENT",
        department: u.department || "",
        phone: u.phone || "",
        created_at: u.createdAt || now,
        updated_at: u.updatedAt || u.createdAt || now,
      });
      counts.users += 1;
    });

    (venues || []).forEach((v) => {
      insertVenue.run({
        id: v.id,
        name: v.name,
        type: v.type || "Venue",
        location: v.location || "",
        capacity: Number(v.capacity) || 1,
        amenities: JSON.stringify(Array.isArray(v.amenities) ? v.amenities : []),
        description: v.description || "",
        image: v.image || "venue",
        status: v.status === "ACTIVE" ? "ACTIVE" : v.status || "ACTIVE",
        open_time: v.openTime || "08:00",
        close_time: v.closeTime || "21:00",
        created_at: v.createdAt || now,
        updated_at: v.updatedAt || v.createdAt || now,
      });
      counts.venues += 1;
    });

    (bookings || []).forEach((b) => {
      insertBooking.run({
        id: b.id,
        venue_id: b.venueId,
        user_id: b.userId,
        title: b.title,
        purpose: b.purpose || "",
        category: b.category || "OTHER",
        date: b.date,
        start_time: b.startTime,
        end_time: b.endTime,
        expected_attendees: b.expectedAttendees ?? null,
        status: b.status || "PENDING",
        admin_remarks: b.adminRemarks || "",
        created_at: b.createdAt || now,
        updated_at: b.updatedAt || b.createdAt || now,
      });
      counts.bookings += 1;
    });
  })();

  Object.values(LEGACY).forEach((file) => {
    if (fs.existsSync(file)) fs.renameSync(file, `${file}.imported`);
  });

  console.log(
    `[migrate] Imported from JSON store: ${counts.users} users, ${counts.venues} venues, ${counts.bookings} bookings. ` +
      `Old files renamed to *.json.imported.`
  );
  return { imported: true, counts };
}

module.exports = migrateFromJson;

if (require.main === module) {
  migrateFromJson();
}
