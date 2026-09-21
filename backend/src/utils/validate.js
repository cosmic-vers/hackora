const { badRequest } = require("../middleware/errors");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Collects every problem so the form can show them all at once. */
class Checker {
  constructor(body = {}) {
    this.body = body;
    this.errors = {};
    this.value = {};
  }

  string(field, { label, required = true, min = 1, max = 300, trim = true } = {}) {
    let raw = this.body[field];
    if (raw === undefined || raw === null) raw = "";
    if (typeof raw !== "string") raw = String(raw);
    const value = trim ? raw.trim() : raw;
    const name = label || field;

    if (!value) {
      if (required) this.errors[field] = `${name} is required.`;
      else this.value[field] = "";
      return this;
    }
    if (value.length < min) this.errors[field] = `${name} must be at least ${min} characters.`;
    else if (value.length > max) this.errors[field] = `${name} must be under ${max} characters.`;
    else this.value[field] = value;
    return this;
  }

  email(field = "email") {
    this.string(field, { label: "Email", max: 200 });
    const value = this.value[field];
    if (value && !EMAIL_RE.test(value)) this.errors[field] = "Enter a valid email address.";
    else if (value) this.value[field] = value.toLowerCase();
    return this;
  }

  password(field = "password", { min = 8 } = {}) {
    const value = this.body[field];
    if (typeof value !== "string" || !value) {
      this.errors[field] = "Password is required.";
      return this;
    }
    if (value.length < min) {
      this.errors[field] = `Password must be at least ${min} characters.`;
      return this;
    }
    if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
      this.errors[field] = "Password must include at least one letter and one number.";
      return this;
    }
    this.value[field] = value;
    return this;
  }

  oneOf(field, allowed, { label, required = true } = {}) {
    const value = this.body[field];
    const name = label || field;
    if (value === undefined || value === null || value === "") {
      if (required) this.errors[field] = `${name} is required.`;
      return this;
    }
    if (!allowed.includes(value)) {
      this.errors[field] = `${name} must be one of: ${allowed.join(", ")}.`;
      return this;
    }
    this.value[field] = value;
    return this;
  }

  integer(field, { label, required = true, min = 1, max = 100000 } = {}) {
    const raw = this.body[field];
    const name = label || field;
    if (raw === undefined || raw === null || raw === "") {
      if (required) this.errors[field] = `${name} is required.`;
      else this.value[field] = null;
      return this;
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || !Number.isInteger(num)) {
      this.errors[field] = `${name} must be a whole number.`;
      return this;
    }
    if (num < min || num > max) {
      this.errors[field] = `${name} must be between ${min} and ${max}.`;
      return this;
    }
    this.value[field] = num;
    return this;
  }

  date(field = "date", { label = "Date", required = true } = {}) {
    const value = this.body[field];
    if (!value) {
      if (required) this.errors[field] = `${label} must be a valid date (YYYY-MM-DD).`;
      else this.value[field] = null;
      return this;
    }
    if (!DATE_RE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00`))) {
      this.errors[field] = `${label} must be a valid date (YYYY-MM-DD).`;
      return this;
    }
    this.value[field] = value;
    return this;
  }

  time(field, { label } = {}) {
    const value = this.body[field];
    const name = label || field;
    if (!value || !TIME_RE.test(value)) {
      this.errors[field] = `${name} must be a valid 24-hour time (HH:MM).`;
      return this;
    }
    this.value[field] = value;
    return this;
  }

  stringArray(field, { max = 20, maxLength = 60 } = {}) {
    const raw = this.body[field];
    if (raw === undefined) return this;
    if (!Array.isArray(raw)) {
      this.errors[field] = `${field} must be a list.`;
      return this;
    }
    this.value[field] = raw
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => item.trim().slice(0, maxLength))
      .slice(0, max);
    return this;
  }

  custom(field, condition, message) {
    if (!condition) this.errors[field] = message;
    return this;
  }

  /** Throws a 400 listing every field that failed. */
  result() {
    const keys = Object.keys(this.errors);
    if (keys.length) {
      throw badRequest(this.errors[keys[0]], this.errors);
    }
    return this.value;
  }
}

const check = (body) => new Checker(body);

function pagination(query, { defaultSize = 20, maxSize = 100 } = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, Number(query.pageSize) || defaultSize));
  return { page, pageSize };
}

module.exports = { check, pagination, EMAIL_RE, DATE_RE, TIME_RE };
