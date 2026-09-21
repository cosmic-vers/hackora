const express = require("express");
const usersRepo = require("../repositories/users.repo");
const { authenticate } = require("../middleware/auth");
const { asyncHandler, badRequest } = require("../middleware/errors");
const { check } = require("../utils/validate");

const router = express.Router();

router.get("/me", authenticate, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

router.patch("/profile", authenticate, asyncHandler(async (req, res) => {
  const data = check(req.body)
    .string("name", { label: "Name", min: 2, max: 80 })
    .string("organization", { label: "Organization / team", required: false, max: 120 })
    .string("phone", { label: "Phone", required: false, max: 30 })
    .result();
  const user = await usersRepo.updateProfile(req.user.id, data);
  res.json({ user: usersRepo.publicUser(user) });
}));

// Google-only authentication: passwords and demo accounts intentionally do not exist.
router.post("/legacy-disabled", asyncHandler(async () => {
  throw badRequest("VenueHub now uses Google login. Continue with Google to create or access your account.");
}));

module.exports = router;
