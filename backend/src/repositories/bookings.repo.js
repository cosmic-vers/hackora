const { v4: uuid } = require("uuid");
const { db, transaction } = require("../database");
const notifications = require("./notifications.repo");
const servicesRepo = require("./services.repo");

function minutesBetween(startTime, endTime) {
  const toMinutes = (value) => {
    const [hours, minutes] = String(value || "00:00").split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };
  return Math.max(0, toMinutes(endTime) - toMinutes(startTime));
}

const SELECT_WITH_JOINS = `
  SELECT b.*,
         v.name     AS venue_name,
         v.location AS venue_location,
         v.capacity AS venue_capacity,
         v.type     AS venue_type,
         u.name     AS requester_name,
         u.email    AS requester_email,
         u.role     AS requester_role,
         u.department AS requester_department,
         d.name     AS decided_by_name
  FROM bookings b
  JOIN venues v ON v.id = b.venue_id
  JOIN users  u ON u.id = b.user_id
  LEFT JOIN users d ON d.id = b.decided_by
`;

function toBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
    venueId: row.venue_id,
    userId: row.user_id,
    title: row.title,
    purpose: row.purpose,
    category: row.category,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    expectedAttendees: row.expected_attendees,
    status: row.status,
    adminRemarks: row.admin_remarks,
    decidedBy: row.decided_by,
    decidedByName: row.decided_by_name || null,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    venueName: row.venue_name,
    venueLocation: row.venue_location,
    venueCapacity: row.venue_capacity,
    venueType: row.venue_type,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    requesterRole: row.requester_role,
    requesterDepartment: row.requester_department,
    baseAmount: Number(row.base_amount || 0),
    servicesAmount: Number(row.services_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    paymentStatus: row.payment_status || 'UNPAID',
    paymentMethod: row.payment_method || '',
    transactionId: row.transaction_id || '',
    receiptNo: row.receipt_no || '',
    refundAmount: Number(row.refund_amount || 0),
    seatingArrangement: row.seating_arrangement || '',
    services: servicesRepo.getForBooking(row.id),
  };
}

function findById(id) {
  return toBooking(db.prepare(`${SELECT_WITH_JOINS} WHERE b.id = ?`).get(id));
}

/**
 * Bookings list with server-side filtering, search and pagination so the admin
 * screen stays fast once there are thousands of rows.
 */
function list({
  userId = null,
  status = "",
  venueId = "",
  search = "",
  from = "",
  to = "",
  page = 1,
  pageSize = 20,
} = {}) {
  const where = [];
  const params = {};

  if (userId) {
    where.push("b.user_id = @userId");
    params.userId = userId;
  }
  if (status) {
    where.push("b.status = @status");
    params.status = status;
  }
  if (venueId) {
    where.push("b.venue_id = @venueId");
    params.venueId = venueId;
  }
  if (from) {
    where.push("b.date >= @from");
    params.from = from;
  }
  if (to) {
    where.push("b.date <= @to");
    params.to = to;
  }
  if (search) {
    where.push("(b.title LIKE @q OR b.purpose LIKE @q OR v.name LIKE @q OR u.name LIKE @q)");
    params.q = `%${search}%`;
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = db
    .prepare(
      `SELECT COUNT(*) AS n FROM bookings b
       JOIN venues v ON v.id = b.venue_id
       JOIN users u ON u.id = b.user_id ${clause}`
    )
    .get(params).n;

  const rows = db
    .prepare(
      `${SELECT_WITH_JOINS} ${clause}
       ORDER BY
         CASE b.status WHEN 'PENDING' THEN 0 ELSE 1 END,
         datetime(b.created_at) DESC
       LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize });

  return { bookings: rows.map(toBooking), total, page, pageSize };
}

/** Bookings that block or collide with a slot (approved + pending, never rejected/cancelled). */
function findOverlapping({ venueId, date, startTime, endTime, excludeId = null }) {
  return db
    .prepare(
      `SELECT * FROM bookings
       WHERE venue_id = @venueId
         AND date = @date
         AND status IN ('PENDING','APPROVED')
         AND start_time < @endTime
         AND @startTime < end_time
         AND (@excludeId IS NULL OR id <> @excludeId)
       ORDER BY start_time`
    )
    .all({ venueId, date, startTime, endTime, excludeId })
    .map((row) => ({
      id: row.id,
      status: row.status,
      title: row.title,
      startTime: row.start_time,
      endTime: row.end_time,
    }));
}

function serviceConflicts({ serviceIds = [], date, startTime, endTime, excludeBookingId = null }) {
  const ids = [...new Set(Array.isArray(serviceIds) ? serviceIds : [])].filter(Boolean);
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  return db.prepare(`
    SELECT bs.service_id, s.name AS service_name, b.id AS booking_id, b.title, b.start_time, b.end_time, b.status
    FROM booking_services bs
    JOIN bookings b ON b.id = bs.booking_id
    JOIN venue_services s ON s.id = bs.service_id
    WHERE bs.service_id IN (${placeholders})
      AND b.date = ?
      AND b.status IN ('PENDING','APPROVED')
      AND b.start_time < ?
      AND ? < b.end_time
      AND (? IS NULL OR b.id <> ?)
    ORDER BY b.start_time
  `).all(...ids, date, endTime, startTime, excludeBookingId, excludeBookingId);
}

function slotsForDate(venueId, date) {
  return db
    .prepare(
      `SELECT b.start_time, b.end_time, b.status, b.title, u.name AS requester_name
       FROM bookings b JOIN users u ON u.id = b.user_id
       WHERE b.venue_id = ? AND b.date = ? AND b.status IN ('PENDING','APPROVED')
       ORDER BY b.start_time`
    )
    .all(venueId, date)
    .map((row) => ({
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
      title: row.title,
      requesterName: row.requester_name,
    }));
}

class ConflictError extends Error {
  constructor(message, conflicts) {
    super(message);
    this.status = 409;
    this.conflicts = conflicts;
  }
}

/**
 * Creates a request. The overlap check and the insert happen in one immediate
 * transaction, so two people submitting the same slot at the same moment cannot
 * both slip past the check.
 */
const create = transaction((data) => {
  const overlapping = findOverlapping(data);
  const approvedConflicts = overlapping.filter((c) => c.status === "APPROVED");
  if (approvedConflicts.length) {
    throw new ConflictError(
      "This venue is already booked for an overlapping time slot.",
      approvedConflicts
    );
  }

  const serviceClashes = serviceConflicts({
    serviceIds: data.serviceIds || [],
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
  });
  const approvedServiceClashes = serviceClashes.filter((c) => c.status === "APPROVED");
  if (approvedServiceClashes.length) {
    throw new ConflictError(
      "One or more selected support services are already assigned to another booking.",
      approvedServiceClashes.map((c) => ({
        title: `${c.service_name}: ${c.title}`,
        startTime: c.start_time,
        endTime: c.end_time,
      }))
    );
  }

  const now = new Date().toISOString();
  const row = {
    id: uuid(),
    venue_id: data.venueId,
    user_id: data.userId,
    title: data.title.trim(),
    purpose: (data.purpose || "").trim(),
    category: data.category || "OTHER",
    date: data.date,
    start_time: data.startTime,
    end_time: data.endTime,
    expected_attendees: data.expectedAttendees ?? null,
    status: "PENDING",
    admin_remarks: "",
    created_at: now,
    updated_at: now,
  };

  const venue = db.prepare('SELECT base_price, price_unit FROM venues WHERE id = ?').get(data.venueId);
  const selected = (data.serviceIds || []).map(id => servicesRepo.findById(id)).filter(Boolean);
  const basePrice = Number(venue?.base_price || 0);
  const priceUnit = String(venue?.price_unit || 'event').toLowerCase();
  const durationHours = Math.max(0, (minutesBetween(data.startTime, data.endTime) / 60));
  row.base_amount = priceUnit === 'hour' ? Math.ceil(durationHours) * basePrice : basePrice;
  row.services_amount = selected.reduce((sum, s) => sum + Number(s.rate || 0), 0);
  row.total_amount = row.base_amount + row.services_amount;
  row.seating_arrangement = (data.seatingArrangement || '').trim();

  db.prepare(
    `INSERT INTO bookings
       (id, venue_id, user_id, title, purpose, category, date, start_time, end_time,
        expected_attendees, status, admin_remarks, created_at, updated_at, base_amount, services_amount, total_amount, seating_arrangement)
     VALUES
       (@id, @venue_id, @user_id, @title, @purpose, @category, @date, @start_time, @end_time,
        @expected_attendees, @status, @admin_remarks, @created_at, @updated_at, @base_amount, @services_amount, @total_amount, @seating_arrangement)`
  ).run(row);

  // Snapshot the selected venue services/contracts onto this booking.
  servicesRepo.attachToBooking(row.id, data.serviceIds || []);

  notifications.notifyAdmins({
    type: "REQUEST",
    title: "New booking request",
    message: `${data.requesterName} requested ${data.venueName} on ${data.date}, ${data.startTime}–${data.endTime}.`,
    link: "/app/admin/bookings",
  });

  return {
    booking: findById(row.id),
    pendingConflicts: overlapping.filter((c) => c.status === "PENDING"),
  };
});

/**
 * Approve or reject. Approving re-checks conflicts and auto-rejects every other
 * pending request for the same overlapping slot — all inside one transaction.
 */
const decide = transaction(({ id, status, adminRemarks, adminId }) => {
  const booking = findById(id);
  if (!booking) return { notFound: true };
  if (booking.status !== "PENDING") {
    return { alreadyDecided: booking.status };
  }

  const now = new Date().toISOString();

  if (status === "APPROVED") {
    const conflicts = findOverlapping({
      venueId: booking.venueId,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      excludeId: booking.id,
    }).filter((c) => c.status === "APPROVED");

    if (conflicts.length) {
      throw new ConflictError(
        "Cannot approve: this slot now conflicts with an already-approved booking.",
        conflicts
      );
    }

    const requestedServiceIds = servicesRepo.getForBooking(booking.id).map((s) => s.id);
    const serviceClashes = serviceConflicts({
      serviceIds: requestedServiceIds,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      excludeBookingId: booking.id,
    }).filter((c) => c.status === "APPROVED");
    if (serviceClashes.length) {
      throw new ConflictError(
        "Cannot approve: a required support service is already assigned to another approved booking.",
        serviceClashes.map((c) => ({ title: `${c.service_name}: ${c.title}`, startTime: c.start_time, endTime: c.end_time }))
      );
    }
  }

  db.prepare(
    `UPDATE bookings
     SET status = @status, admin_remarks = @remarks, decided_by = @adminId,
         decided_at = @now, updated_at = @now
     WHERE id = @id`
  ).run({ id, status, remarks: adminRemarks || "", adminId, now });

  const autoRejected = [];
  if (status === "APPROVED") {
    const clashing = findOverlapping({
      venueId: booking.venueId,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      excludeId: booking.id,
    }).filter((c) => c.status === "PENDING");

    const rejectStmt = db.prepare(
      `UPDATE bookings
       SET status = 'REJECTED', admin_remarks = @remarks, decided_by = @adminId,
           decided_at = @now, updated_at = @now
       WHERE id = @id AND status = 'PENDING'`
    );

    clashing.forEach((c) => {
      rejectStmt.run({
        id: c.id,
        remarks: "Auto-rejected: the slot was allocated to another approved booking.",
        adminId,
        now,
      });
      const rejected = findById(c.id);
      autoRejected.push(rejected);
      notifications.create({
        userId: rejected.userId,
        type: "REJECTED",
        title: "Request not approved",
        message: `${rejected.title} at ${rejected.venueName} was not approved — the slot went to another booking.`,
        link: "/app/my-bookings",
      });
    });
  }

  notifications.create({
    userId: booking.userId,
    type: status,
    title: status === "APPROVED" ? "Booking approved" : "Booking rejected",
    message:
      status === "APPROVED"
        ? `${booking.title} at ${booking.venueName} is confirmed for ${booking.date}, ${booking.startTime}–${booking.endTime}.`
        : `${booking.title} at ${booking.venueName} was rejected.${adminRemarks ? ` Reason: ${adminRemarks}` : ""}`,
    link: "/app/my-bookings",
  });

  return { booking: findById(id), autoRejected };
});

const cancel = transaction(({ id, actor }) => {
  const booking = findById(id);
  if (!booking) return { notFound: true };
  if (actor.role !== "ADMIN" && booking.userId !== actor.id) return { forbidden: true };
  if (["REJECTED", "CANCELLED"].includes(booking.status)) {
    return { alreadyDecided: booking.status };
  }

  const now = new Date().toISOString();
  const nextPayment = booking.paymentStatus === 'PAID' ? 'REFUND_PENDING' : booking.paymentStatus;
  db.prepare("UPDATE bookings SET status = 'CANCELLED', payment_status = ?, refund_amount = CASE WHEN ? = 'PAID' THEN total_amount ELSE refund_amount END, updated_at = ? WHERE id = ?").run(nextPayment, booking.paymentStatus, now, id);

  if (booking.paymentStatus === "PAID") {
    notifications.notifyAdmins({
      type: "REFUND",
      title: "Refund request pending",
      message: `${booking.title} at ${booking.venueName} was cancelled after payment. Refund of ₹${Number(booking.totalAmount || 0).toLocaleString("en-IN")} is awaiting review.`,
      link: "/app/admin/bookings",
    });
  }

  if (actor.role === "ADMIN" && booking.userId !== actor.id) {
    notifications.create({
      userId: booking.userId,
      type: "CANCELLED",
      title: "Booking cancelled",
      message: `${booking.title} at ${booking.venueName} on ${booking.date} was cancelled by an administrator.`,
      link: "/app/my-bookings",
    });
  }

  return { booking: findById(id) };
});

function statsForUser(userId) {
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'PENDING')   AS pending,
         SUM(status = 'APPROVED')  AS approved,
         SUM(status = 'REJECTED')  AS rejected,
         SUM(status = 'CANCELLED') AS cancelled
       FROM bookings ${userId ? "WHERE user_id = ?" : ""}`
    )
    .get(...(userId ? [userId] : []));
  return {
    total: row.total || 0,
    pending: row.pending || 0,
    approved: row.approved || 0,
    rejected: row.rejected || 0,
    cancelled: row.cancelled || 0,
  };
}

function upcoming({ userId = null, limit = 5 } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = db
    .prepare(
      `${SELECT_WITH_JOINS}
       WHERE b.status = 'APPROVED' AND b.date >= @today
         ${userId ? "AND b.user_id = @userId" : ""}
       ORDER BY b.date ASC, b.start_time ASC
       LIMIT @limit`
    )
    .all({ today, userId, limit });
  return rows.map(toBooking);
}

function recent({ userId = null, limit = 6 } = {}) {
  const rows = db
    .prepare(
      `${SELECT_WITH_JOINS}
       ${userId ? "WHERE b.user_id = @userId" : ""}
       ORDER BY datetime(b.created_at) DESC
       LIMIT @limit`
    )
    .all({ userId, limit });
  return rows.map(toBooking);
}


function markPaid(id, { method = 'ONLINE_DEMO', transactionId, receiptNo }) {
  const now = new Date().toISOString();
  db.prepare(`UPDATE bookings SET payment_status='PAID', payment_method=?, transaction_id=?, receipt_no=?, updated_at=? WHERE id=? AND status='APPROVED' AND payment_status='UNPAID'`).run(method, transactionId, receiptNo, now, id);
  return findById(id);
}
function requestRefund(id, amount) {
  const now = new Date().toISOString();
  db.prepare(`UPDATE bookings SET payment_status='REFUND_PENDING', refund_amount=?, updated_at=? WHERE id=? AND payment_status='PAID'`).run(Number(amount || 0), now, id);
  return findById(id);
}
function decideRefund(id, status, amount) {
  const current = findById(id);
  if (!current) return null;
  if (current.paymentStatus !== 'REFUND_PENDING') return current;
  const requested = Number(amount || current.refundAmount || 0);
  const safeAmount = Math.max(0, Math.min(requested, current.totalAmount));
  const now = new Date().toISOString();
  // A rejected request returns to PAID so the customer can submit a corrected request later.
  const paymentStatus = status === 'APPROVED' ? 'REFUNDED' : 'PAID';
  db.prepare(`UPDATE bookings SET payment_status=?, refund_amount=?, updated_at=? WHERE id=? AND payment_status='REFUND_PENDING'`).run(paymentStatus, safeAmount, now, id);
  notifications.create({
    userId: current.userId,
    type: status === "APPROVED" ? "REFUNDED" : "REFUND_REJECTED",
    title: status === "APPROVED" ? "Refund approved" : "Refund request rejected",
    message: status === "APPROVED"
      ? `₹${safeAmount.toLocaleString("en-IN")} refund approved for ${current.title}.`
      : `Your refund request for ${current.title} was rejected. The booking remains paid and can be reviewed again.`,
    link: "/app/my-bookings",
  });
  return findById(id);
}

module.exports = {
  findById,
  list,
  findOverlapping,
  slotsForDate,
  create,
  decide,
  cancel,
  statsForUser,
  upcoming,
  recent,
  markPaid,
  requestRefund,
  decideRefund,
  serviceConflicts,
  ConflictError,
};
