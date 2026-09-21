const { createClient } = require("@supabase/supabase-js");
const env = require("../config/env");
const usersRepo = require("../repositories/users.repo");
const { unauthorized, forbidden } = require("./errors");

const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return next(unauthorized("Continue with Google to log in."));

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return next(unauthorized("Your Google session has expired. Log in again."));
    req.authUser = data.user;
    req.user = await usersRepo.upsertFromIdentity(data.user);
    return next();
  } catch (error) {
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
