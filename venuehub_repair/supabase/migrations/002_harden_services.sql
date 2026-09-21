-- Repair migration for databases created by an earlier VenueHub build.
-- It makes the optional service layer forward-compatible without deleting data.
create extension if not exists btree_gist;

create table if not exists venue_services (
  id uuid primary key,
  venue_id uuid not null references venues(id) on delete cascade,
  name text not null,
  category text not null default 'OTHER',
  provider_name text not null default '',
  role text not null default '',
  phone text not null default '',
  email text not null default '',
  contract_ref text not null default '',
  contract_start date,
  contract_end date,
  rate numeric(12,2) not null default 0,
  billing_unit text not null default 'event',
  scope text not null default '',
  status text not null default 'ACTIVE',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists booking_services (
  id uuid primary key,
  booking_id uuid not null references bookings(id) on delete cascade,
  service_id uuid not null references venue_services(id) on delete restrict,
  quantity integer not null default 1,
  agreed_rate numeric(12,2) not null default 0,
  notes text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (booking_id, service_id)
);

-- Older versions may have the tables but not the newer columns.
ALTER TABLE venue_services ADD COLUMN IF NOT EXISTS role text not null default '';
ALTER TABLE venue_services ADD COLUMN IF NOT EXISTS phone text not null default '';
ALTER TABLE venue_services ADD COLUMN IF NOT EXISTS email text not null default '';
ALTER TABLE venue_services ADD COLUMN IF NOT EXISTS contract_ref text not null default '';
ALTER TABLE venue_services ADD COLUMN IF NOT EXISTS contract_start date;
ALTER TABLE venue_services ADD COLUMN IF NOT EXISTS contract_end date;
ALTER TABLE venue_services ADD COLUMN IF NOT EXISTS rate numeric(12,2) not null default 0;
ALTER TABLE venue_services ADD COLUMN IF NOT EXISTS billing_unit text not null default 'event';
ALTER TABLE venue_services ADD COLUMN IF NOT EXISTS scope text not null default '';
ALTER TABLE venue_services ADD COLUMN IF NOT EXISTS status text not null default 'ACTIVE';
ALTER TABLE venue_services ADD COLUMN IF NOT EXISTS notes text not null default '';
ALTER TABLE venue_services ADD COLUMN IF NOT EXISTS created_at timestamptz not null default now();
ALTER TABLE venue_services ADD COLUMN IF NOT EXISTS updated_at timestamptz not null default now();
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS quantity integer not null default 1;
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS agreed_rate numeric(12,2) not null default 0;
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS notes text not null default '';
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS created_at timestamptz not null default now();

create index if not exists idx_venue_services_venue on venue_services(venue_id, status);
create index if not exists idx_booking_services_booking on booking_services(booking_id);

UPDATE venue_services SET category='OTHER' WHERE category IS NULL OR category='';
UPDATE venue_services SET status='ACTIVE' WHERE status IS NULL OR status='';
UPDATE booking_services SET quantity=1 WHERE quantity IS NULL OR quantity<1;
