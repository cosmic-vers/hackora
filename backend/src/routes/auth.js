const express = require("express");
const bcrypt = require("bcryptjs");
const usersRepo = require("../repositories/users.repo");
const { authenticate, signToken } = require("../middleware/auth");
const { asyncHandler, badRequest, unauthorized, conflict } = require("../middleware/errors");
const { check } = require("../utils/validate");

const router = express.Router();
const SELF_SERVICE_ROLES = ["STUDENT", "FACULTY", "CLUB", "DEPARTMENT"]; // admins are seeded

router.post(
  "/register",
  asyncHandler((req, res) => {
    const data = check(req.body)
      .string("name", { label: "Name", min: 2, max: 80 })
      .email()
      .password()
      .oneOf("role", SELF_SERVICE_ROLES, { label: "Role" })
      .string("department", { label: "Department", required: false, max: 80 })
      .string("phone", { label: "Phone", required: false, max: 20 })
      .result();

    if (usersRepo.findByEmail(data.email)) {
      throw conflict("An account with this email already exists. Log in instead.");
    }

    const user = usersRepo.create(data);
    res.status(201).json({ token: signToken(user), user: usersRepo.publicUser(user) });
  })
);

router.post(
  "/login",
  asyncHandler((req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw badRequest("Enter your email and password.");

    const user = usersRepo.findByEmail(email);
    // Same message either way so the form cannot be used to discover accounts.
    if (!user || !bcrypt.compareSync(password, user.password)) {
      throw unauthorized("That email and password do not match an account.");
    }

    res.json({ token: signToken(user), user: usersRepo.publicUser(user) });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler((req, res) => {
    res.json({ user: req.user });
  })
);

router.patch(
  "/profile",
  authenticate,
  asyncHandler((req, res) => {
    const data = check(req.body)
      .string("name", { label: "Name", min: 2, max: 80 })
      .string("department", { label: "Department", required: false, max: 80 })
      .string("phone", { label: "Phone", required: false, max: 20 })
      .result();

    const user = usersRepo.updateProfile(req.user.id, data);
    res.json({ user: usersRepo.publicUser(user) });
  })
);

router.patch(
  "/password",
  authenticate,
  asyncHandler((req, res) => {
    const { currentPassword } = req.body || {};
    const data = check(req.body).password("newPassword").result();

    const user = usersRepo.findById(req.user.id);
    if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password)) {
      throw badRequest("Your current password is not correct.", {
        currentPassword: "Your current password is not correct.",
      });
    }
    if (bcrypt.compareSync(data.newPassword, user.password)) {
      throw badRequest("Choose a password you have not used here before.", {
        newPassword: "Choose a password you have not used here before.",
      });
    }

    usersRepo.updatePassword(user.id, data.newPassword);
    // The old token stays valid until it expires; issue a fresh one so the
    // client is never left holding a token minted before the change.
    res.json({ token: signToken(user), message: "Password changed." });
  })
);

module.exports = router;
