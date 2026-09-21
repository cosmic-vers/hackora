require("dotenv").config();

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    if (isProduction) throw new Error(`[config] ${name} is required in production.`);
    console.warn(`[config] ${name} is not set.`);
  }
  return value;
}

function parseList(value, fallback = []) {
  if (!value) return fallback;
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

const env = {
  NODE_ENV,
  isProduction,
  PORT: Number(process.env.PORT || 5000),
  DATABASE_URL: required("DATABASE_URL"),
  SUPABASE_URL: required("SUPABASE_URL"),
  SUPABASE_SECRET_KEY: required("SUPABASE_SECRET_KEY"),
  CORS_ORIGINS: parseList(process.env.CORS_ORIGINS, [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]),
  ADMIN_EMAILS: parseList(process.env.ADMIN_EMAILS),
  APP_TIMEZONE: process.env.APP_TIMEZONE || "Asia/Kolkata",
  AI_PROVIDER: (process.env.AI_PROVIDER || "fallback").toLowerCase(),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  SEED_ON_START: process.env.SEED_ON_START !== "false",
};

module.exports = env;
