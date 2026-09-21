const express = require("express");
const venuesRepo = require("../repositories/venues.repo");
const bookingsRepo = require("../repositories/bookings.repo");
const { authenticate, authorize } = require("../middleware/auth");
const { asyncHandler, notFound, conflict } = require("../middleware/errors");
const { check } = require("../utils/validate");
const blocksRepo = require("../repositories/blocks.repo");

const router = express.Router();
const VENUE_STATUSES = ["ACTIVE", "MAINTENANCE", "INACTIVE"];

// GET /api/venues?search=&type=&status=&minCapacity=
router.get(
  "/",
  asyncHandler((req, res) => {
    const venues = venuesRepo.list({
      search: req.query.search || "",
      type: req.query.type || "",
      status: req.query.status || "",
      minCapacity: req.query.minCapacity || 0,
    });
    res.json({ venues, types: venuesRepo.distinctTypes() });
  })
);

router.get(
  "/:id",
  asyncHandler((req, res) => {
    const venue = venuesRepo.findById(req.params.id);
    if (!venue) throw notFound("That venue no longer exists.");
    res.json({ venue });
  })
);

// GET /api/venues/:id/availability?date=YYYY-MM-DD
router.get(
  "/:id/availability",
  asyncHandler((req, res) => {
    const { date } = check({ date: req.query.date }).date().result();
    const venue = venuesRepo.findById(req.params.id);
    if (!venue) throw notFound("That venue no longer exists.");

    res.json({
      date,
      openTime: venue.openTime,
      closeTime: venue.closeTime,
      bookedSlots: bookingsRepo.slotsForDate(venue.id, date),
      blockedSlots: blocksRepo.list({ venueId: venue.id, from: date, to: date }).map(b => ({ startTime:b.startTime, endTime:b.endTime, reason:b.reason })),
    });
  })
);

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  asyncHandler((req, res) => {
    const data = check(req.body)
      .string("name", { label: "Name", min: 2, max: 100 })
      .string("type", { label: "Venue type", max: 50 })
      .string("location", { label: "Location", max: 120 })
      .integer("capacity", { label: "Capacity", min: 1, max: 100000 })
      .string("description", { label: "Description", required: false, max: 600 })
      .string("image", { label: "Image", required: false, max: 40 })
      .integer("basePrice", { label: "Base price", required: false, min: 0 })
      .string("priceUnit", { label: "Price unit", required: false, max: 30 })
      .stringArray("photos", { max: 10, maxLength: 500 })
      .stringArray("amenities")
      .time("openTime", { label: "Opening time" })
      .time("closeTime", { label: "Closing time" })
      .result();

    if (data.openTime >= data.closeTime) {
      throw conflict("Closing time must be after opening time.");
    }

    res.status(201).json({ venue: venuesRepo.create(data) });
  })
);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  asyncHandler((req, res) => {
    const venue = venuesRepo.findById(req.params.id);
    if (!venue) throw notFound("That venue no longer exists.");

    const checker = check(req.body);
    if (req.body.name !== undefined) checker.string("name", { label: "Name", min: 2, max: 100 });
    if (req.body.type !== undefined) checker.string("type", { label: "Venue type", max: 50 });
    if (req.body.location !== undefined) checker.string("location", { label: "Location", max: 120 });
    if (req.body.capacity !== undefined) checker.integer("capacity", { label: "Capacity", min: 1 });
    if (req.body.description !== undefined)
      checker.string("description", { label: "Description", required: false, max: 600 });
    if (req.body.image !== undefined)
      checker.string("image", { label: "Image", required: false, max: 40 });
    if (req.body.basePrice !== undefined) checker.integer("basePrice", { label: "Base price", min: 0 });
    if (req.body.priceUnit !== undefined) checker.string("priceUnit", { label: "Price unit", max: 30 });
    if (req.body.photos !== undefined) checker.stringArray("photos", { max: 10, maxLength: 500 });
    if (req.body.status !== undefined)
      checker.oneOf("status", VENUE_STATUSES, { label: "Status" });
    if (req.body.amenities !== undefined) checker.stringArray("amenities");
    if (req.body.openTime !== undefined) checker.time("openTime", { label: "Opening time" });
    if (req.body.closeTime !== undefined) checker.time("closeTime", { label: "Closing time" });

    const data = checker.result();
    const openTime = data.openTime || venue.openTime;
    const closeTime = data.closeTime || venue.closeTime;
    if (openTime >= closeTime) throw conflict("Closing time must be after opening time.");

    res.json({ venue: venuesRepo.update(venue.id, data) });
  })
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  asyncHandler((req, res) => {
    const venue = venuesRepo.findById(req.params.id);
    if (!venue) throw notFound("That venue no longer exists.");

    if (venuesRepo.hasActiveBookings(venue.id)) {
      throw conflict(
        "This venue has pending or approved bookings. Set it to maintenance instead of deleting it."
      );
    }

    venuesRepo.remove(venue.id);
    res.json({ message: "Venue deleted." });
  })
);

module.exports = router;
