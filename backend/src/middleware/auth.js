const jwt = require("jsonwebtoken");
const env = require("../config/env");
const usersRepo = require("../repositories/users.repo");
const { unauthorized, forbidden } = require("./errors");

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return next(unauthorized("Log in to continue."));

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    return next(unauthorized("Your session has expired. Log in again."));
  }

  const user = usersRepo.findById(payload.id);
  if (!user) return next(unauthorized("This account no longer exists."));

  req.user = usersRepo.publicUser(user);
  return next();
}

/** Attaches req.user when a valid token is present, but never blocks the request. */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return next();
  try {
    const payload = jwt.verify(header.slice(7).trim(), env.JWT_SECRET);
    const user = usersRepo.findById(payload.id);
    if (user) req.user = usersRepo.publicUser(user);
  } catch (err) {
    /* ignore — treated as a guest */
  }
  return next();
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    return next();
  };
}

module.exports = { authenticate, optionalAuth, authorize, signToken };
