const express = require("express");
const notificationsRepo = require("../repositories/notifications.repo");
const { authenticate } = require("../middleware/auth");
const { asyncHandler, notFound } = require("../middleware/errors");

const router = express.Router();

router.get(
  "/",
  authenticate,
  asyncHandler((req, res) => {
    res.json(notificationsRepo.listForUser(req.user.id, { limit: Number(req.query.limit) || 30 }));
  })
);

router.patch(
  "/:id/read",
  authenticate,
  asyncHandler((req, res) => {
    if (!notificationsRepo.markRead(req.user.id, req.params.id)) {
      throw notFound("That notification no longer exists.");
    }
    res.json(notificationsRepo.listForUser(req.user.id));
  })
);

router.patch(
  "/read-all",
  authenticate,
  asyncHandler((req, res) => {
    notificationsRepo.markAllRead(req.user.id);
    res.json(notificationsRepo.listForUser(req.user.id));
  })
);

router.delete(
  "/",
  authenticate,
  asyncHandler((req, res) => {
    notificationsRepo.clear(req.user.id);
    res.json({ notifications: [], unread: 0 });
  })
);

module.exports = router;
