const env = require("./src/config/env");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const { close: closeDb } = require("./src/database");
const migrateFromJson = require("./src/database/migrate-json");
const seed = require("./src/seed");

const authRoutes = require("./src/routes/auth");
const venueRoutes = require("./src/routes/venues");
const bookingRoutes = require("./src/routes/bookings");
const analyticsRoutes = require("./src/routes/analytics");
const userRoutes = require("./src/routes/users");
const notificationRoutes = require("./src/routes/notifications");
const serviceRoutes = require("./src/routes/services");
const recommendationRoutes = require("./src/routes/recommendations");
const blockRoutes = require("./src/routes/blocks");
const { notFoundHandler, errorHandler } = require("./src/middleware/errors");

migrateFromJson();
if (env.SEED_ON_START) seed();

const app = express();
app.set("trust proxy", 1); // correct client IPs behind a reverse proxy

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      // Same-origin requests and tools like curl send no Origin header.
      if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(morgan(env.isProduction ? "combined" : "dev"));

// Brute-force protection on the credential endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Wait a few minutes and try again." },
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "You are sending requests too quickly. Slow down a moment." },
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "VenueHub API", env: env.NODE_ENV, time: new Date().toISOString() });
});

app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/blocks", blockRoutes);

app.use(notFoundHandler);
app.use(errorHandler(env.isProduction));

const server = app.listen(env.PORT, () => {
  console.log(`VenueHub API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal) {
  console.log(`\n${signal} received — closing server and database.`);
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000).unref();
}

["SIGINT", "SIGTERM"].forEach((sig) => process.on(sig, () => shutdown(sig)));

module.exports = app;
