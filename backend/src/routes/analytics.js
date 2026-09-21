const express = require("express");
const { db } = require("../database");
const bookingsRepo = require("../repositories/bookings.repo");
const venuesRepo = require("../repositories/venues.repo");
const usersRepo = require("../repositories/users.repo");
const { authenticate, authorize } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errors");

const router = express.Router();

/** Dashboard payload for whoever is logged in — one request instead of three. */
router.get(
  "/summary",
  authenticate,
  asyncHandler((req, res) => {
    const isAdmin = req.user.role === "ADMIN";
    const scopeId = isAdmin ? null : req.user.id;

    res.json({
      stats: bookingsRepo.statsForUser(scopeId),
      upcoming: bookingsRepo.upcoming({ userId: scopeId, limit: 5 }),
      recent: bookingsRepo.recent({ userId: scopeId, limit: 6 }),
      venues: {
        total: venuesRepo.count(),
        active: venuesRepo.list({ status: "ACTIVE" }).length,
      },
    });
  })
);

router.get(
  "/overview",
  authenticate,
  authorize("ADMIN"),
  asyncHandler((req, res) => {
    const stats = bookingsRepo.statsForUser(null);

    const statusBreakdown = [
      { name: "Pending", value: stats.pending },
      { name: "Approved", value: stats.approved },
      { name: "Rejected", value: stats.rejected },
      { name: "Cancelled", value: stats.cancelled },
    ];

    const venueUtilization = db
      .prepare(
        `SELECT v.name AS name,
                COUNT(b.id) AS bookings,
                COALESCE(SUM(
                  (CAST(substr(b.end_time,1,2) AS INTEGER) * 60 + CAST(substr(b.end_time,4,2) AS INTEGER)) -
                  (CAST(substr(b.start_time,1,2) AS INTEGER) * 60 + CAST(substr(b.start_time,4,2) AS INTEGER))
                ), 0) / 60.0 AS hours
         FROM venues v
         LEFT JOIN bookings b ON b.venue_id = v.id AND b.status = 'APPROVED'
         GROUP BY v.id
         ORDER BY bookings DESC, v.name ASC`
      )
      .all()
      .map((r) => ({ name: r.name, bookings: r.bookings, hours: Math.round(r.hours * 10) / 10 }));

    const categoryBreakdown = db
      .prepare(
        `SELECT category AS name, COUNT(*) AS value
         FROM bookings GROUP BY category ORDER BY value DESC`
      )
      .all();

    const monthlyTrend = db
      .prepare(
        `SELECT substr(date, 1, 7) AS month,
                COUNT(*) AS bookings,
                SUM(status = 'APPROVED') AS approved
         FROM bookings
         WHERE date <> ''
         GROUP BY month
         ORDER BY month ASC
         LIMIT 12`
      )
      .all();

    const peakHours = db
      .prepare(
        `SELECT substr(start_time, 1, 2) || ':00' AS hour, COUNT(*) AS bookings
         FROM bookings WHERE status = 'APPROVED'
         GROUP BY hour ORDER BY hour ASC`
      )
      .all();

    const busiestDays = db
      .prepare(
        `SELECT date, COUNT(*) AS bookings
         FROM bookings WHERE status = 'APPROVED'
         GROUP BY date ORDER BY bookings DESC, date ASC LIMIT 5`
      )
      .all();

    const roleBreakdown = db
      .prepare(
        `SELECT u.role AS name, COUNT(b.id) AS value
         FROM users u LEFT JOIN bookings b ON b.user_id = u.id
         GROUP BY u.role ORDER BY value DESC`
      )
      .all();

    const revenue = db.prepare(`SELECT COALESCE(SUM(total_amount),0) AS gross, COALESCE(SUM(CASE WHEN payment_status='PAID' THEN total_amount ELSE 0 END),0) AS paid, COALESCE(SUM(CASE WHEN payment_status='REFUNDED' THEN refund_amount ELSE 0 END),0) AS refunded FROM bookings`).get();
    const revenueTrend = db.prepare(`SELECT substr(date,1,7) AS month, COALESCE(SUM(total_amount),0) AS booked, COALESCE(SUM(CASE WHEN payment_status='PAID' THEN total_amount ELSE 0 END),0) AS collected FROM bookings GROUP BY month ORDER BY month ASC LIMIT 12`).all();

    const decided = stats.approved + stats.rejected;

    res.json({
      totals: {
        totalBookings: stats.total,
        pending: stats.pending,
        approved: stats.approved,
        rejected: stats.rejected,
        cancelled: stats.cancelled,
        totalVenues: venuesRepo.count(),
        activeVenues: venuesRepo.list({ status: "ACTIVE" }).length,
        totalUsers: usersRepo.count(),
        approvalRate: decided ? Math.round((stats.approved / decided) * 100) : 0,
        grossBookedValue: Math.round(revenue.gross),
        collectedRevenue: Math.round(revenue.paid),
        refunds: Math.round(revenue.refunded),
      },
      statusBreakdown,
      venueUtilization,
      categoryBreakdown,
      monthlyTrend,
      peakHours,
      busiestDays,
      roleBreakdown,
      revenueTrend,
    });
  })
);

module.exports = router;
