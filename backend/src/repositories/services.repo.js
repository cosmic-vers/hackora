const { v4: uuid } = require("uuid");
const { db } = require("../database");

const CATEGORIES = ["DESIGN","CLEANING","SECURITY","TECHNICAL","DECORATION","CATERING","ELECTRICAL","MAINTENANCE","OTHER"];

function toService(row) {
  if (!row) return null;
  return {
    id: row.id,
    venueId: row.venue_id,
    venueName: row.venue_name,
    name: row.name,
    category: row.category,
    providerName: row.provider_name,
    role: row.role,
    phone: row.phone,
    email: row.email,
    contractRef: row.contract_ref,
    contractStart: row.contract_start,
    contractEnd: row.contract_end,
    rate: row.rate,
    billingUnit: row.billing_unit,
    scope: row.scope,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function list({ venueId = "", status = "", category = "" } = {}) {
  const where = [];
  const params = {};
  if (venueId) { where.push("s.venue_id = @venueId"); params.venueId = venueId; }
  if (status) { where.push("s.status = @status"); params.status = status; }
  if (category) { where.push("s.category = @category"); params.category = category; }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return db.prepare(`SELECT s.*, v.name AS venue_name FROM venue_services s JOIN venues v ON v.id=s.venue_id ${clause} ORDER BY s.category, s.provider_name, s.name`).all(params).map(toService);
}

function findById(id) {
  return toService(db.prepare(`SELECT s.*, v.name AS venue_name FROM venue_services s JOIN venues v ON v.id=s.venue_id WHERE s.id=?`).get(id));
}

function create(data) {
  const now = new Date().toISOString();
  const row = {
    id: uuid(), venue_id: data.venueId, name: data.name.trim(), category: data.category,
    provider_name: data.providerName.trim(), role: (data.role || "").trim(), phone: (data.phone || "").trim(),
    email: (data.email || "").trim(), contract_ref: (data.contractRef || "").trim(),
    contract_start: data.contractStart || "", contract_end: data.contractEnd || "", rate: Number(data.rate || 0),
    billing_unit: (data.billingUnit || "event").trim(), scope: (data.scope || "").trim(), status: data.status || "ACTIVE",
    notes: (data.notes || "").trim(), created_at: now, updated_at: now
  };
  db.prepare(`INSERT INTO venue_services
    (id,venue_id,name,category,provider_name,role,phone,email,contract_ref,contract_start,contract_end,rate,billing_unit,scope,status,notes,created_at,updated_at)
    VALUES (@id,@venue_id,@name,@category,@provider_name,@role,@phone,@email,@contract_ref,@contract_start,@contract_end,@rate,@billing_unit,@scope,@status,@notes,@created_at,@updated_at)`).run(row);
  return findById(row.id);
}

function update(id, data) {
  const columns = { name:"name", category:"category", providerName:"provider_name", role:"role", phone:"phone", email:"email", contractRef:"contract_ref", contractStart:"contract_start", contractEnd:"contract_end", rate:"rate", billingUnit:"billing_unit", scope:"scope", status:"status", notes:"notes" };
  const sets=[]; const params={id, updated_at:new Date().toISOString()};
  for (const [key,col] of Object.entries(columns)) if (data[key] !== undefined) { sets.push(`${col}=@${col}`); params[col]=key==='rate'?Number(data[key]||0):data[key]; }
  if (!sets.length) return findById(id);
  db.prepare(`UPDATE venue_services SET ${sets.join(', ')}, updated_at=@updated_at WHERE id=@id`).run(params);
  return findById(id);
}

function remove(id) {
  return db.prepare("DELETE FROM venue_services WHERE id=?").run(id).changes > 0;
}

function attachToBooking(bookingId, serviceIds=[]) {
  const ids=[...new Set(Array.isArray(serviceIds)?serviceIds:[])];
  if (!ids.length) return [];
  const services = ids.map(id => findById(id)).filter(Boolean);
  const stmt = db.prepare(`INSERT OR IGNORE INTO booking_services (id,booking_id,service_id,quantity,agreed_rate,notes,created_at) VALUES (?,?,?,?,?,?,?)`);
  const now=new Date().toISOString();
  services.forEach(s=>stmt.run(uuid(),bookingId,s.id,1,s.rate,"",now));
  return getForBooking(bookingId);
}

function getForBooking(bookingId) {
  return db.prepare(`SELECT bs.*, s.name, s.category, s.provider_name, s.role, s.phone, s.email, s.contract_ref, s.contract_start, s.contract_end, s.rate, s.billing_unit, s.scope, s.status
    FROM booking_services bs JOIN venue_services s ON s.id=bs.service_id WHERE bs.booking_id=? ORDER BY s.category,s.provider_name`).all(bookingId).map(r=>({
      id:r.service_id, bookingServiceId:r.id, name:r.name, category:r.category, providerName:r.provider_name, role:r.role,
      phone:r.phone, email:r.email, contractRef:r.contract_ref, contractStart:r.contract_start, contractEnd:r.contract_end,
      rate:r.rate, agreedRate:r.agreed_rate, billingUnit:r.billing_unit, scope:r.scope, status:r.status, quantity:r.quantity, notes:r.notes
    }));
}

module.exports={CATEGORIES,list,findById,create,update,remove,attachToBooking,getForBooking};
