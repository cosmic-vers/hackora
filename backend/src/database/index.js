const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const env = require("../config/env");

const dbFile = env.DATABASE_FILE;
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new Database(dbFile);

// WAL lets readers work while a writer holds the lock — important once several
// people are browsing venues while an admin approves requests.
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");
db.pragma("synchronous = NORMAL");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('STUDENT','FACULTY','CLUB','DEPARTMENT','ADMIN')),
  department  TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS venues (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  location    TEXT NOT NULL,
  capacity    INTEGER NOT NULL CHECK (capacity > 0),
  amenities   TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL DEFAULT '',
  image       TEXT NOT NULL DEFAULT 'venue',
  status      TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','MAINTENANCE','INACTIVE')),
  open_time   TEXT NOT NULL DEFAULT '08:00',
  close_time  TEXT NOT NULL DEFAULT '21:00',
  base_price  REAL NOT NULL DEFAULT 0,
  price_unit  TEXT NOT NULL DEFAULT 'event',
  photos      TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_venues_status ON venues (status);

CREATE TABLE IF NOT EXISTS venue_blocks (
  id          TEXT PRIMARY KEY,
  venue_id    TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  reason      TEXT NOT NULL DEFAULT 'Maintenance',
  created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL,
  CHECK (start_time < end_time)
);
CREATE INDEX IF NOT EXISTS idx_venue_blocks_slot ON venue_blocks (venue_id, date, start_time, end_time);

CREATE TABLE IF NOT EXISTS bookings (
  id                 TEXT PRIMARY KEY,
  venue_id           TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  purpose            TEXT NOT NULL DEFAULT '',
  category           TEXT NOT NULL DEFAULT 'OTHER',
  date               TEXT NOT NULL,
  start_time         TEXT NOT NULL,
  end_time           TEXT NOT NULL,
  expected_attendees INTEGER,
  status             TEXT NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  admin_remarks      TEXT NOT NULL DEFAULT '',
  decided_by         TEXT REFERENCES users(id) ON DELETE SET NULL,
  decided_at         TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  base_amount        REAL NOT NULL DEFAULT 0,
  services_amount    REAL NOT NULL DEFAULT 0,
  total_amount       REAL NOT NULL DEFAULT 0,
  payment_status     TEXT NOT NULL DEFAULT 'UNPAID',
  payment_method     TEXT NOT NULL DEFAULT '',
  transaction_id     TEXT NOT NULL DEFAULT '',
  receipt_no         TEXT NOT NULL DEFAULT '',
  refund_amount      REAL NOT NULL DEFAULT 0,
  seating_arrangement TEXT NOT NULL DEFAULT '',
  CHECK (start_time < end_time)
);
CREATE INDEX IF NOT EXISTS idx_bookings_slot   ON bookings (venue_id, date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user   ON bookings (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status, date);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'INFO',
  title      TEXT NOT NULL,
  message    TEXT NOT NULL DEFAULT '',
  link       TEXT NOT NULL DEFAULT '',
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read, created_at);

CREATE TABLE IF NOT EXISTS venue_services (
  id               TEXT PRIMARY KEY,
  venue_id         TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL CHECK (category IN ('DESIGN','CLEANING','SECURITY','TECHNICAL','DECORATION','CATERING','ELECTRICAL','MAINTENANCE','OTHER')),
  provider_name    TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT '',
  phone            TEXT NOT NULL DEFAULT '',
  email            TEXT NOT NULL DEFAULT '',
  contract_ref     TEXT NOT NULL DEFAULT '',
  contract_start   TEXT NOT NULL DEFAULT '',
  contract_end     TEXT NOT NULL DEFAULT '',
  rate             REAL NOT NULL DEFAULT 0,
  billing_unit     TEXT NOT NULL DEFAULT 'event',
  scope            TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','INACTIVE')),
  notes            TEXT NOT NULL DEFAULT '',
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_venue_services_venue ON venue_services (venue_id, status);

CREATE TABLE IF NOT EXISTS booking_services (
  id               TEXT PRIMARY KEY,
  booking_id       TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id       TEXT NOT NULL REFERENCES venue_services(id) ON DELETE RESTRICT,
  quantity         INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  agreed_rate      REAL NOT NULL DEFAULT 0,
  notes            TEXT NOT NULL DEFAULT '',
  created_at       TEXT NOT NULL,
  UNIQUE (booking_id, service_id)
);
CREATE INDEX IF NOT EXISTS idx_booking_services_booking ON booking_services (booking_id);
`;

db.exec(SCHEMA);


function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
ensureColumn('venues', 'base_price', 'REAL NOT NULL DEFAULT 0');
ensureColumn('venues', 'price_unit', "TEXT NOT NULL DEFAULT 'event'");
ensureColumn('venues', 'photos', "TEXT NOT NULL DEFAULT '[]'");
ensureColumn('bookings', 'base_amount', 'REAL NOT NULL DEFAULT 0');
ensureColumn('bookings', 'services_amount', 'REAL NOT NULL DEFAULT 0');
ensureColumn('bookings', 'total_amount', 'REAL NOT NULL DEFAULT 0');
ensureColumn('bookings', 'payment_status', "TEXT NOT NULL DEFAULT 'UNPAID'");
ensureColumn('bookings', 'payment_method', "TEXT NOT NULL DEFAULT ''");
ensureColumn('bookings', 'transaction_id', "TEXT NOT NULL DEFAULT ''");
ensureColumn('bookings', 'receipt_no', "TEXT NOT NULL DEFAULT ''");
ensureColumn('bookings', 'refund_amount', 'REAL NOT NULL DEFAULT 0');
ensureColumn('bookings', 'seating_arrangement', "TEXT NOT NULL DEFAULT ''");

/**
 * Only one approved booking may exist per venue/date/overlapping slot. SQLite
 * cannot express an overlap constraint declaratively, so the invariant is
 * enforced inside a transaction (see bookings repository) — this trigger is the
 * backstop that catches anything writing to the table another way.
 */
db.exec(`
CREATE TRIGGER IF NOT EXISTS trg_bookings_no_double_approval
BEFORE UPDATE OF status ON bookings
WHEN NEW.status = 'APPROVED' AND OLD.status <> 'APPROVED'
BEGIN
  SELECT RAISE(ABORT, 'overlapping approved booking')
  WHERE EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id <> NEW.id
      AND b.venue_id = NEW.venue_id
      AND b.date = NEW.date
      AND b.status = 'APPROVED'
      AND b.start_time < NEW.end_time
      AND NEW.start_time < b.end_time
  );
END;
`);

/** Wrap a function so every statement inside runs in one atomic transaction. */
function transaction(fn) {
  return db.transaction(fn);
}

function close() {
  try {
    db.close();
  } catch (err) {
    /* already closed */
  }
}

module.exports = { db, transaction, close, dbFile };
