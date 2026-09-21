const { v4: uuid } = require("uuid");
const { query } = require("../database");

function toVenue(row) {
  if (!row) return null;
  const parseJson = (value, fallback = []) => {
    if (Array.isArray(value)) return value;
    try { return JSON.parse(value || JSON.stringify(fallback)); } catch { return fallback; }
  };
  return {
    id: row.id,
    ownerId: row.owner_id || null,
    name: row.name,
    type: row.type,
    location: row.location,
    capacity: Number(row.capacity),
    amenities: parseJson(row.amenities),
    description: row.description || "",
    image: row.image || "venue",
    status: row.status,
    openTime: String(row.open_time || "08:00").slice(0,5),
    closeTime: String(row.close_time || "21:00").slice(0,5),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    basePrice: Number(row.base_price || 0),
    priceUnit: row.price_unit || "event",
    photos: parseJson(row.photos),
    upcomingBookings: row.upcoming_bookings == null ? undefined : Number(row.upcoming_bookings),
  };
}

async function list({ search = "", type = "", status = "", minCapacity = 0, ownerId = "" } = {}) {
  const where = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`(v.name ILIKE $${params.length} OR v.location ILIKE $${params.length} OR v.type ILIKE $${params.length} OR v.description ILIKE $${params.length})`);
  }
  if (type) { params.push(type); where.push(`v.type = $${params.length}`); }
  if (status) { params.push(status); where.push(`v.status = $${params.length}`); }
  if (minCapacity) { params.push(Number(minCapacity)); where.push(`v.capacity >= $${params.length}`); }
  if (ownerId) { params.push(ownerId); where.push(`v.owner_id = $${params.length}`); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(new Date().toISOString().slice(0,10));
  const { rows } = await query(
    `SELECT v.*,
       (SELECT COUNT(*) FROM bookings b WHERE b.venue_id=v.id AND b.status='APPROVED' AND b.date >= $${params.length}) AS upcoming_bookings
     FROM venues v ${clause}
     ORDER BY v.capacity DESC, v.name ASC`, params
  );
  return rows.map(toVenue);
}

async function findById(id) {
  const { rows } = await query("SELECT * FROM venues WHERE id=$1", [id]);
  return toVenue(rows[0]);
}

async function distinctTypes() {
  const { rows } = await query("SELECT DISTINCT type FROM venues ORDER BY type");
  return rows.map((r) => r.type);
}

async function create(data) {
  const id = uuid();
  const { rows } = await query(
    `INSERT INTO venues (id,owner_id,name,type,location,capacity,amenities,description,image,status,open_time,close_time,base_price,price_unit,photos)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15::jsonb) RETURNING *`,
    [id, data.ownerId || null, data.name.trim(), data.type.trim(), data.location.trim(), Number(data.capacity), JSON.stringify(Array.isArray(data.amenities)?data.amenities:[]), (data.description||"").trim(), data.image||"venue", data.status||"ACTIVE", data.openTime||"08:00", data.closeTime||"21:00", Number(data.basePrice||0), data.priceUnit||"event", JSON.stringify(Array.isArray(data.photos)?data.photos:[])]
  );
  return toVenue(rows[0]);
}

const ALLOWED = { name:"name", type:"type", location:"location", capacity:"capacity", description:"description", image:"image", status:"status", openTime:"open_time", closeTime:"close_time", basePrice:"base_price", priceUnit:"price_unit" };
async function update(id, data) {
  const sets=[]; const params=[];
  for (const [key,col] of Object.entries(ALLOWED)) {
    if (data[key] !== undefined) { params.push(key === "capacity" || key === "basePrice" ? Number(data[key]) : data[key]); sets.push(`${col}=$${params.length}`); }
  }
  if (data.photos !== undefined) { params.push(JSON.stringify(Array.isArray(data.photos)?data.photos:[])); sets.push(`photos=$${params.length}::jsonb`); }
  if (data.amenities !== undefined) { params.push(JSON.stringify(Array.isArray(data.amenities)?data.amenities:[])); sets.push(`amenities=$${params.length}::jsonb`); }
  if (!sets.length) return findById(id);
  params.push(id);
  const { rows } = await query(`UPDATE venues SET ${sets.join(", ")}, updated_at=now() WHERE id=$${params.length} RETURNING *`, params);
  return toVenue(rows[0]);
}

async function remove(id) { const r = await query("DELETE FROM venues WHERE id=$1", [id]); return r.rowCount > 0; }
async function ownerOf(id) { const { rows } = await query("SELECT owner_id FROM venues WHERE id=$1", [id]); return rows[0]?.owner_id || null; }
async function hasActiveBookings(id) { const { rows } = await query("SELECT COUNT(*)::int AS n FROM bookings WHERE venue_id=$1 AND status IN ('PENDING','APPROVED')", [id]); return Number(rows[0]?.n||0)>0; }
async function count() { const { rows } = await query("SELECT COUNT(*)::int AS n FROM venues"); return Number(rows[0]?.n||0); }

module.exports = { list, findById, distinctTypes, create, update, remove, hasActiveBookings, ownerOf, count, toVenue };
