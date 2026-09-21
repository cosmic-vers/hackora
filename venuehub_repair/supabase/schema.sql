create extension if not exists btree_gist;

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'CUSTOMER' check (role in ('CUSTOMER','VENUE_OWNER','ADMIN','SUPER_ADMIN')),
  organization text not null default '',
  phone text not null default '',
  avatar_url text not null default '',
  auth_provider text not null default 'google',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_users_role on users(role);
create index if not exists idx_users_created_at on users(created_at desc);

create table if not exists venues (
  id uuid primary key,
  owner_id uuid references users(id) on delete set null,
  name text not null,
  type text not null,
  location text not null,
  capacity integer not null check (capacity > 0),
  amenities jsonb not null default '[]'::jsonb,
  description text not null default '',
  image text not null default 'venue',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','MAINTENANCE','INACTIVE')),
  open_time time not null default '08:00',
  close_time time not null default '21:00',
  base_price numeric(12,2) not null default 0,
  price_unit text not null default 'event' check (price_unit in ('event','hour')),
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_venues_status on venues(status);
create index if not exists idx_venues_owner on venues(owner_id);

create table if not exists venue_blocks (
  id uuid primary key,
  venue_id uuid not null references venues(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default 'Maintenance',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint venue_blocks_time_check check (start_time < end_time),
  constraint venue_blocks_range_check check (starts_at < ends_at),
  constraint venue_blocks_no_overlap exclude using gist (
    venue_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
);
create index if not exists idx_venue_blocks_slot on venue_blocks(venue_id, date, starts_at, ends_at);

create table if not exists bookings (
  id uuid primary key,
  venue_id uuid not null references venues(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  purpose text not null default '',
  category text not null default 'OTHER',
  date date not null,
  start_time time not null,
  end_time time not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  expected_attendees integer,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','CANCELLED')),
  admin_remarks text not null default '',
  decided_by uuid references users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  base_amount numeric(12,2) not null default 0,
  services_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  payment_status text not null default 'UNPAID' check (payment_status in ('UNPAID','PAID','REFUND_PENDING','REFUNDED')),
  payment_method text not null default '',
  transaction_id text not null default '',
  receipt_no text not null default '',
  refund_amount numeric(12,2) not null default 0,
  seating_arrangement text not null default '',
  constraint bookings_time_check check (start_time < end_time),
  constraint bookings_range_check check (starts_at < ends_at),
  constraint bookings_no_overlap exclude using gist (
    venue_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'APPROVED')
);
create index if not exists idx_bookings_venue_date on bookings(venue_id, date, status);
create index if not exists idx_bookings_user_created on bookings(user_id, created_at desc);
create index if not exists idx_bookings_status_date on bookings(status, date);

create table if not exists notifications (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  type text not null default 'INFO',
  title text not null,
  message text not null default '',
  link text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications(user_id, is_read, created_at desc);

create table if not exists venue_services (
  id uuid primary key,
  venue_id uuid not null references venues(id) on delete cascade,
  name text not null,
  category text not null check (category in ('DESIGN','CLEANING','SECURITY','TECHNICAL','DECORATION','CATERING','ELECTRICAL','MAINTENANCE','PHOTOGRAPHY','SEATING','OTHER')),
  provider_name text not null,
  role text not null default '',
  phone text not null default '',
  email text not null default '',
  contract_ref text not null default '',
  contract_start date,
  contract_end date,
  rate numeric(12,2) not null default 0,
  billing_unit text not null default 'event',
  scope text not null default '',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','EXPIRED','INACTIVE')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_venue_services_venue on venue_services(venue_id, status);

create table if not exists booking_services (
  id uuid primary key,
  booking_id uuid not null references bookings(id) on delete cascade,
  service_id uuid not null references venue_services(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  agreed_rate numeric(12,2) not null default 0,
  notes text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (booking_id, service_id)
);
create index if not exists idx_booking_services_booking on booking_services(booking_id);

create table if not exists payments (
  id uuid primary key,
  booking_id uuid not null references bookings(id) on delete cascade,
  provider text not null default 'DEMO',
  transaction_id text not null unique,
  amount numeric(12,2) not null,
  currency text not null default 'INR',
  status text not null default 'PAID' check (status in ('PAID','FAILED','REFUNDED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_payments_booking on payments(booking_id, created_at desc);

create table if not exists refunds (
  id uuid primary key,
  booking_id uuid not null references bookings(id) on delete cascade,
  amount numeric(12,2) not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','PROCESSED')),
  reason text not null default '',
  processed_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_refunds_booking on refunds(booking_id, created_at desc);

create table if not exists audit_logs (
  id uuid primary key,
  actor_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_created on audit_logs(created_at desc);

-- The React app never uses the Supabase Data API for application data; it talks to the Express API.
-- Enable RLS so a leaked publishable key cannot read/write these tables directly.
alter table users enable row level security;
alter table venues enable row level security;
alter table venue_blocks enable row level security;
alter table bookings enable row level security;
alter table notifications enable row level security;
alter table venue_services enable row level security;
alter table booking_services enable row level security;
alter table payments enable row level security;
alter table refunds enable row level security;
alter table audit_logs enable row level security;

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at before update on users for each row execute function set_updated_at();
drop trigger if exists trg_venues_updated_at on venues;
create trigger trg_venues_updated_at before update on venues for each row execute function set_updated_at();
drop trigger if exists trg_bookings_updated_at on bookings;
create trigger trg_bookings_updated_at before update on bookings for each row execute function set_updated_at();
drop trigger if exists trg_venue_services_updated_at on venue_services;
create trigger trg_venue_services_updated_at before update on venue_services for each row execute function set_updated_at();
drop trigger if exists trg_refunds_updated_at on refunds;
create trigger trg_refunds_updated_at before update on refunds for each row execute function set_updated_at();
