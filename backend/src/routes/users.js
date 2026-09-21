const express = require("express");
const usersRepo = require("../repositories/users.repo");
const { authenticate, authorize } = require("../middleware/auth");
const { asyncHandler, notFound, badRequest } = require("../middleware/errors");
const { pagination } = require("../utils/validate");

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  asyncHandler((req, res) => {
    const { page, pageSize } = pagination(req.query, { defaultSize: 50 });
    res.json(
      usersRepo.list({
        search: req.query.search || "",
        role: req.query.role || "",
        page,
        pageSize,
      })
    );
  })
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  asyncHandler((req, res) => {
    if (req.params.id === req.user.id) {
      throw badRequest("You cannot remove your own account.");
    }

    const target = usersRepo.findById(req.params.id);
    if (!target) throw notFound("That account no longer exists.");
    if (target.role === "ADMIN") {
      throw badRequest("Administrator accounts cannot be removed from here.");
    }

    usersRepo.remove(target.id);
    res.json({ message: `${target.name}'s account and bookings were removed.` });
  })
);

module.exports = router;
