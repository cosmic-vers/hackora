# VenueHub — Function Hall Booking & Management System

**Book smarter. Manage better.**

VenueHub is a centralised platform where students, faculty, clubs, departments, and
administrators discover, book, and manage college function halls, seminar halls,
auditoriums, classrooms, and other event venues — replacing registers, WhatsApp
messages, and scattered departmental processes with one system that gives real-time
availability, an approval workflow, conflict detection that actually holds under
concurrency, and admin control.

---

## Features

**For everyone who books**
- Venue directory with search, type, capacity, and availability filters
- A visual day timeline: see what is already booked, with your requested slot drawn
  over it before you submit
- Clash warnings while you fill the form, not after you press send
- Status tracking for every request, with the admin's reason attached
- In-app notifications when a request is approved, rejected, or cancelled
- Profile and password management

**For administrators**
- One queue of pending requests, with search, venue filter, and pagination
- Approve or reject with remarks; approving auto-rejects every request that clashes
  with the slot, and notifies those requesters
- Venue management including per-venue opening hours, maintenance status, and amenities
- People management with booking counts per account
- Analytics: approval rate, venue utilisation in bookings and hours, monthly trend,
  peak start times, busiest days, and category mix

**Throughout**
- Light and dark themes
- Works on a phone — the navigation is a drawer, tables become stacked cards
- Keyboard focus styles, skip link, ARIA-labelled controls, reduced-motion support

---

## Tech stack

**Frontend:** React 18, Vite, React Router, Recharts (lazy-loaded), Lucide icons, and
hand-written CSS driven by a token system — no UI framework.

**Backend:** Node.js, Express, JWT auth, bcrypt password hashing, and **SQLite via
better-sqlite3** — a real database with foreign keys, indexes, transactions, and WAL
mode, in a single file with no server to install.

---

## Project structure

```
venuehub/
├── backend/
│   ├── server.js                       # Express app, security middleware, shutdown
│   ├── nodemon.json
│   └── src/
│       ├── config/env.js               # Env loading + secret validation
│       ├── database/
│       │   ├── index.js                # Connection, schema, pragmas, guard trigger
│       │   └── migrate-json.js         # One-time import from the old JSON store
│       ├── repositories/               # users, venues, bookings, notifications
│       ├── middleware/                 # auth (JWT + roles), errors
│       ├── utils/validate.js           # Field-level request validation
│       ├── routes/                     # auth, venues, bookings, analytics, users, notifications
│       └── seed.js                     # Demo accounts, venues, sample bookings
└── frontend/
    └── src/
        ├── api/client.js               # Axios instance + error normaliser
        ├── context/                    # Auth, Theme, Toast
        ├── components/                 # Layout, timeline, toasts, skeletons, dialogs…
        ├── pages/                      # Landing, auth, dashboard, booking, admin, profile
        └── styles/                     # Tokens (light + dark) and component styles
```


## SE-04 checklist coverage

VenueHub now maps directly to the judge checklist: customer registration/login, venue listing with capacity/location/photos/facilities/pricing, real-time availability, date/time booking, double-booking prevention, online demo checkout, digital receipts, cancellation and refund workflow, event types including wedding/birthday/conference/reception, catering/decoration/photography/sound/seating services, booking history, admin dashboard, maintenance and blocked dates, notifications, revenue analytics, and AI-assisted venue recommendations.

### AI Venue Recommendation
The AI Venue Advisor accepts event requirements and ranks venues using capacity, availability, facilities, event context, location, support services, and pricing. When `AI_PROVIDER=openai` is configured it can generate AI explanations/ranking; otherwise a deterministic local scoring engine keeps the feature available.

### Payments
The included checkout is a working **demo online payment flow** that records a transaction, marks the booking paid, and generates a digital receipt. It is deliberately labelled demo mode. Connect Razorpay/Stripe credentials and replace the provider call before processing real money.

---

## Getting started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Generate a secret and put it in `.env` as `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then:

```bash
npm run dev          # http://localhost:5000
```

On first run the server creates `backend/data/venuehub.db`, imports any old JSON data,
and seeds demo accounts, six venues, and a few sample bookings.

### 2. Frontend

The repository intentionally does **not** ship `node_modules`. Install dependencies with `npm install` in each folder so Vite/React and the native SQLite module are installed for your machine.


```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:5000`, so just open
**http://localhost:5173**.

---

## Demo accounts

| Role    | Email                 | Password    |
|---------|-----------------------|-------------|
| Admin   | admin@venuehub.edu     | Admin@123   |
| Faculty | faculty@venuehub.edu   | Faculty@123 |
| Student | student@venuehub.edu   | Student@123 |
| Club    | club@venuehub.edu      | Club@123    |

Anyone can register as a Student, Faculty, Club, or Department. Admin accounts are
only created by the seed script, so nobody can sign themselves up as one.

Set `SEED_ON_START=false` before pointing this at a real campus database.

The included `backend/.env` is configured for local development with the rule-based AI fallback and a stable development JWT secret. Replace that secret before any real deployment.

---

## The database

SQLite through better-sqlite3. Seven core tables — `users`, `venues`, `bookings`,
`notifications`, `venue_services`, `booking_services`, and `venue_blocks` — with
foreign keys on, cascading deletes where safe, and indexes on the lookups that matter
for availability, services, maintenance blocks, and personal booking lists.

**Why the change matters.** The previous JSON-file store did read-modify-write on
disk with no locking, so two people submitting at the same moment could both pass the
"is this slot free?" check and both get written. Now every write goes through a
repository, and booking creation and approval each run inside a single transaction:
the overlap check and the insert are atomic. A `BEFORE UPDATE` trigger is the backstop
— it aborts any attempt to approve a booking that overlaps one already approved, no
matter which code path tries.

**Migrating existing data.** If `backend/data/*.json` exists from the old version, it
is imported on first boot and the files are renamed to `*.json.imported` so it never
runs twice. You can also run it manually:

```bash
npm run migrate:json
```

**Moving to Postgres later.** Every query lives in `src/repositories/`. Swapping the
driver means rewriting the repository layer; nothing in the routes touches SQL.

---

## How conflict detection works

Each booking carries a `venueId`, `date`, `startTime`, and `endTime`.

1. **On submit** — the request is checked against everything already on that venue and
   date. Overlapping an **approved** booking is refused outright, and the clashing slot
   is returned so the form can show it. Overlapping only **pending** requests is
   allowed, with a warning that whichever is approved first gets the room.
2. **On approve** — conflicts are re-checked (in case something changed while the
   request sat in the queue), then every other pending request overlapping that slot is
   rejected automatically with an explanatory note, and each of those requesters is
   notified.
3. **Always** — two approved bookings can never overlap. That invariant is enforced by
   the transaction and by a database trigger.

Bookings are also validated against the venue's opening hours, its capacity, and a
15-minute minimum duration, and cannot be placed in the past.

---

## Security

- `JWT_SECRET` is required. In production the server refuses to start without a strong
  one; in development it generates a temporary secret and warns.
- Passwords are bcrypt-hashed and must be at least 8 characters with a letter and a
  number.
- Login returns the same message for an unknown email and a wrong password, so the form
  cannot be used to discover which accounts exist.
- Rate limiting: 20 attempts per 15 minutes on login and registration, 300 requests per
  minute across the rest of the API.
- CORS is an allowlist — set `CORS_ORIGINS` for your deployed frontend.
- `helmet` sets security headers; request bodies are capped at 100 kB.
- Role checks run server-side on every protected route; the frontend's route guards are
  convenience, not security.

---

## API

| Method | Endpoint | Who | Description |
|--------|----------|-----|-------------|
| POST | `/api/auth/register` | Public | Register a requester account |
| POST | `/api/auth/login` | Public | Log in and receive a JWT |
| GET | `/api/auth/me` | Any | Validate the current session |
| GET | `/api/venues` | Public | Search/filter venues |
| GET | `/api/venues/:id` | Public | Venue details, price and photos |
| GET | `/api/venues/:id/availability` | Public | Bookings and maintenance blocks for a date |
| POST/PUT/DELETE | `/api/venues...` | Admin | Manage venues |
| GET/POST | `/api/bookings` | Any | Create and list bookings |
| PATCH | `/api/bookings/:id/status` | Admin | Approve/reject requests |
| POST | `/api/bookings/:id/pay` | Owner/Admin | Demo online payment |
| POST/PATCH | `/api/bookings/:id/refund` | Owner/Admin | Refund request and decision |
| GET/POST | `/api/services` | Any/Admin | Venue support contracts |
| GET/POST/DELETE | `/api/blocks` | Any/Admin | Maintenance and blocked periods |
| POST | `/api/recommendations` | Any | AI/rule-based venue recommendation |
| GET | `/api/analytics/overview` | Admin | Booking, utilisation and revenue analytics |
| GET/PATCH/DELETE | `/api/notifications...` | Any | In-app notifications |


## Design notes

A collegiate-modern identity rather than generic SaaS: deep ink navy, brass gold, warm
paper, with Fraunces for display type and Inter for UI text. Every colour is a token
defined twice, once per theme, so dark mode is a variable swap rather than a second
stylesheet. The brass accent is the one loud thing; everything else stays quiet.

---

## Possible next steps

- Email or SMS on approval and rejection
- Recurring bookings and calendar (.ics) export
- QR check-in for approved events
- Move to Postgres if you need more than one API instance
- Automated tests around the conflict logic


## New: Venue support contracts

VenueHub now includes a venue-specific **Support Contracts** layer. Admins can keep on-site workers and service providers in one place — designers, cleaners, security, technical staff, decorators, electricians and maintenance teams — with:

- Provider/contact details
- Contract reference and validity dates
- Scope of work
- Rate and billing unit
- Active/expired/inactive status
- Venue-specific assignment

When a user books a venue, active contracts for that venue appear directly inside the booking form. Users can select the support services they need along with the hall booking, and the selected services are attached to the booking for admin visibility.

Admin navigation: **Support contracts**.


## AI Venue Recommendation

VenueHub now includes an **AI Venue Advisor** at `/app/ai-recommend`.

The recommendation request considers:
- Event title, purpose and category
- Expected attendees and venue capacity
- Exact date/time availability
- Venue opening hours
- Required amenities/equipment
- Required support services and contracts
- Preferred campus location
- Event/venue context

### AI mode
Set these in `backend/.env` to enable the AI ranking/explanation layer:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

The API sends the event requirements plus live venue/booking/service data to the configured model. The model can rank and explain up to five grounded venue recommendations.

### Safe fallback
If the AI provider is not configured or the AI request fails, VenueHub automatically falls back to a transparent local scoring engine. The UI clearly labels this as **LOCAL FALLBACK** instead of pretending that a rule-based result is AI.

### Demo flow
1. Log in.
2. Open **AI Venue Advisor**.
3. Enter an event such as a 250-person technical workshop.
4. Select Projector, Sound System, Technical support and Cleaning.
5. Choose a date/time.
6. Click **Find my best-fit venues**.
7. Review the fit score, availability, facilities, support services and trade-offs.
8. Click **Use this venue** to continue to the booking form.


## Live deployment

See `DEPLOY_RENDER.md` for the production deployment setup for Render.
#   h a c k o r a  
 