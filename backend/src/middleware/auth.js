const { createClient } = require("@supabase/supabase-js");
const env = require("../config/env");
const usersRepo = require("../repositories/users.repo");
const { unauthorized, forbidden } = require("./errors");

const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const AUTH_CHECK_TIMEOUT_MS = 8000;

// supabase-js has no built-in timeout on this call. If Supabase's auth API
// is slow, unreachable, or misconfigured (wrong SUPABASE_URL/key), this
// would otherwise hang forever — and every write action (confirming a
// booking, approving one, paying) goes through this middleware, so a stuck
// call here looks exactly like "the server isn't responding" to the user.
function getUserWithTimeout(token) {
  return Promise.race([
    supabaseAdmin.auth.getUser(token),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AUTH_TIMEOUT")), AUTH_CHECK_TIMEOUT_MS)
    ),
  ]);
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return next(unauthorized("Continue with Google to log in."));

  try {
    const { data, error } = await getUserWithTimeout(token);
    if (error || !data?.user) return next(unauthorized("Your Google session has expired. Log in again."));
    req.authUser = data.user;
    req.user = await usersRepo.upsertFromIdentity(data.user);
    return next();
  } catch (error) {
    if (error.message === "AUTH_TIMEOUT") {
      console.error("[auth] Supabase auth check timed out after", AUTH_CHECK_TIMEOUT_MS, "ms");
      const err = new Error("The login service is taking too long to respond. Please try again.");
      err.status = 503;
      return next(err);
    }
    console.error("[auth] token verification failed", error.message);
    return next(unauthorized("We could not verify your Google session. Log in again."));
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    return next();
  };
}

module.exports = { authenticate, authorize, supabaseAdmin };
