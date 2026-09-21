require("dotenv").config();

const crypto = require("crypto");
const path = require("path");

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

function requiredSecret(name) {
  const value = process.env[name];

  if (value && value.length >= 24 && !value.includes("change_me")) return value;

  if (isProduction) {
    console.error(
      `\n[config] ${name} is missing, too short, or still the placeholder value.\n` +
        `         Set a strong random value before starting in production, e.g.\n` +
        `         ${name}=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")\n`
    );
    process.exit(1);
  }

  const generated = crypto.randomBytes(48).toString("hex");
  console.warn(
    `[config] ${name} is not set — generated a temporary development secret. ` +
      `Everyone will be logged out when the server restarts. Add ${name} to backend/.env to fix this.`
  );
  return generated;
}

function parseList(value, fallback) {
  if (!value) return fallback;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const env = {
  NODE_ENV,
  isProduction,
  PORT: Number(process.env.PORT || 5000),
  JWT_SECRET: requiredSecret("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  DATABASE_FILE:
    process.env.DATABASE_FILE || path.join(__dirname, "..", "..", "data", "venuehub.db"),
  CORS_ORIGINS: parseList(process.env.CORS_ORIGINS, [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]),
  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS || 10),
  AI_PROVIDER: (process.env.AI_PROVIDER || "fallback").toLowerCase(),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  SEED_ON_START: process.env.SEED_ON_START !== "false",
};

module.exports = env;
