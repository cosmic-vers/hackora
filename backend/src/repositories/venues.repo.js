const { v4: uuid } = require("uuid");
const { db } = require("../database");

function toVenue(row) {
  if (!row) return null;
  let amenities = [];
  try {
    amenities = JSON.parse(row.amenities || "[]");
  } catch (err) {
    amenities = [];
  }
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    location: row.location,
    capacity: row.capacity,
    amenities,
    description: row.description,
    image: row.image,
    status: row.status,
    openTime: row.open_time,
    closeTime: row.close_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    basePrice: Number(row.base_price || 0),
    priceUnit: row.price_unit || 'event',
    photos: (() => { try { return JSON.parse(row.photos || '[]'); } catch { return []; } })(),
    upcomingBookings: row.upcoming_bookings ?? undefined,
  };
}

function list({ search = "", type = "", status = "", minCapacity = 0 } = {}) {
  const where = [];
  const params = { today: new Date().toISOString().slice(0, 10) };

  if (search) {
    where.push("(v.name LIKE @q OR v.location LIKE @q OR v.type LIKE @q OR v.description LIKE @q)");
    params.q = `%${search}%`;
  }
  if (type) {
    where.push("v.type = @type");
    params.type = type;
  }
  if (status) {
    where.push("v.status = @status");
    params.status = status;
  }
  if (minCapacity) {
    where.push("v.capacity >= @minCapacity");
    params.minCapacity = Number(minCapacity);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT v.*,
              (SELECT COUNT(*) FROM bookings b
                WHERE b.venue_id = v.id AND b.status = 'APPROVED' AND b.date >= @today) AS upcoming_bookings
       FROM venues v ${clause}
       ORDER BY v.capacity DESC, v.name ASC`
    )
    .all(params);

  return rows.map(toVenue);
}

function findById(id) {
  return toVenue(db.prepare("SELECT * FROM venues WHERE id = ?").get(id));
}

function distinctTypes() {
  return db
    .prepare("SELECT DISTINCT type FROM venues ORDER BY type")
    .all()
    .map((r) => r.type);
}

function create(data) {
  const now = new Date().toISOString();
  const venue = {
    id: uuid(),
    name: data.name.trim(),
    type: data.type.trim(),
    location: data.location.trim(),
    capacity: Number(data.capacity),
    amenities: JSON.stringify(Array.isArray(data.amenities) ? data.amenities : []),
    description: (data.description || "").trim(),
    image: data.image || "venue",
    status: data.status || "ACTIVE",
    open_time: data.openTime || "08:00",
    close_time: data.closeTime || "21:00",
    base_price: Number(data.basePrice || 0),
    price_unit: data.priceUnit || "event",
    photos: JSON.stringify(Array.isArray(data.photos) ? data.photos : []),
    created_at: now,
    updated_at: now,
  };
  db.prepare(
    `INSERT INTO venues
       (id, name, type, location, capacity, amenities, description, image, status, open_time, close_time, base_price, price_unit, photos, created_at, updated_at)
     VALUES
       (@id, @name, @type, @location, @capacity, @amenities, @description, @image, @status, @open_time, @close_time, @base_price, @price_unit, @photos, @created_at, @updated_at)`
  ).run(venue);
  return findById(venue.id);
}

const UPDATABLE = {
  name: "name",
  type: "type",
  location: "location",
  capacity: "capacity",
  description: "description",
  image: "image",
  status: "status",
  openTime: "open_time",
  closeTime: "close_time",
  basePrice: "base_price",
  priceUnit: "price_unit",
  photos: "photos",
};

function update(id, data) {
  const sets = [];
  const params = { id, updated_at: new Date().toISOString() };

  Object.entries(UPDATABLE).forEach(([key, column]) => {
    if (data[key] !== undefined) {
      sets.push(`${column} = @${column}`);
      params[column] = column === "capacity" ? Number(data[key]) : data[key];
    }
  });
  if (data.photos !== undefined) {
    sets.push("photos = @photos");
    params.photos = JSON.stringify(Array.isArray(data.photos) ? data.photos : []);
  }
  if (data.amenities !== undefined) {
    sets.push("amenities = @amenities");
    params.amenities = JSON.stringify(Array.isArray(data.amenities) ? data.amenities : []);
  }
  if (!sets.length) return findById(id);

  db.prepare(`UPDATE venues SET ${sets.join(", ")}, updated_at = @updated_at WHERE id = @id`).run(
    params
  );
  return findById(id);
}

function remove(id) {
  return db.prepare("DELETE FROM venues WHERE id = ?").run(id).changes > 0;
}

function hasActiveBookings(id) {
  return (
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM bookings WHERE venue_id = ? AND status IN ('PENDING','APPROVED')"
      )
      .get(id).n > 0
  );
}

function count() {
  return db.prepare("SELECT COUNT(*) AS n FROM venues").get().n;
}

module.exports = {
  list,
  findById,
  distinctTypes,
  create,
  update,
  remove,
  hasActiveBookings,
  count,
  toVenue,
};
