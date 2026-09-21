# VenueHub — Function Hall & Event Venue Platform

**Book smarter. Manage better. Run better events.**

VenueHub is a scalable booking and operations platform for function halls, banquet venues, conference centres, auditoriums, outdoor spaces, and other event venues. It is designed for customers, venue owners, event organizers, organisations, and administrators rather than a single college or campus.

## What VenueHub does

- Discover venues by type, location, capacity, facilities, price, photos, and availability.
- Check date/time availability before requesting a booking.
- Prevent approved double-bookings with PostgreSQL constraints and transaction-level locking.
- Let customers request venues for weddings, birthdays, conferences, receptions, launches, workshops, celebrations, and other events.
- Attach catering, decoration, photography, sound/AV, seating, cleaning, security, electrical, and maintenance services to bookings.
- Manage venue maintenance and blocked periods.
- Route bookings through approval, payment, cancellation, and refund workflows.
- Generate digital booking receipts and in-app notifications.
- Provide admin analytics for utilisation, booking volume, approvals, cancellations, and revenue.
- Recommend venues using AI when enabled, grounded in live venue, availability, facility, pricing, location, and support-service data. A transparent local scoring engine remains available as a fallback.
- Give venue owners their own venue-management scope so the platform can grow into a multi-venue marketplace.

## Production architecture

```text
Google
  │
  ▼
Supabase Auth ───────────────┐
  │ JWT                      │
  ▼                          ▼
VenueHub React         VenueHub Express API
(Render Static)              │
                             ▼
                       Supabase PostgreSQL
                             │
                    bookings / venues / users /
                    services / payments / refunds /
                    maintenance / notifications
```

**Frontend:** React 18 + Vite + React Router + Recharts + Lucide + custom CSS

**Backend:** Node.js + Express + PostgreSQL (`pg`) + Supabase Auth verification

**Database:** Supabase PostgreSQL

**Authentication:** Supabase Auth with Google OAuth — no demo passwords

**AI:** Optional OpenAI ranking/explanation layer with deterministic fallback

## Project structure

```text
venuehub/
├── backend/
│   ├── server.js
│   ├── .env.example
│   └── src/
│       ├── config/env.js
│       ├── database/index.js
│       ├── repositories/
│       ├── middleware/
│       ├── routes/
│       ├── services/venueRecommender.js
│       ├── utils/validate.js
│       └── seed.js
├── frontend/
│   ├── .env.example
│   └── src/
│       ├── api/client.js
│       ├── context/
│       ├── components/
│       ├── pages/
│       ├── styles/
│       └── supabase.js
├── supabase/
│   ├── schema.sql
│   └── migrations/001_organization.sql
├── render.yaml
├── START_HERE.md
└── DEPLOY_RENDER.md
```

## Authentication

Every user signs in with Google through Supabase Auth. There are no VenueHub demo usernames or passwords.

New Google accounts become `CUSTOMER` automatically. Administrator access is controlled by the backend `ADMIN_EMAILS` environment variable. Administrators can promote accounts to `VENUE_OWNER` or `ADMIN` from the People screen.

The frontend receives the user's Supabase session and sends the access token in the `Authorization: Bearer <token>` header. The Express API verifies that token with Supabase before serving protected data.

## Database

VenueHub has been moved from local SQLite/demo storage to **Supabase PostgreSQL**.

Run `supabase/schema.sql` in the Supabase SQL Editor for a new project. If you are upgrading an older VenueHub database that still uses the `department` column, run `supabase/migrations/001_organization.sql` after the schema file.

PostgreSQL is a better fit for the scaled architecture because it provides managed persistence, strong constraints, concurrent transactions, indexing, and safe overlap protection for bookings. Supabase also combines the PostgreSQL database with managed authentication.

## Local setup

### 1. Supabase

Create a Supabase project and run `supabase/schema.sql`.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 3. Frontend

Open another terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Environment variables

Backend:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=YOUR_SUPABASE_SESSION_POOLER_CONNECTION_STRING
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=YOUR_SUPABASE_SECRET_KEY
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ADMIN_EMAILS=your-admin@gmail.com
APP_TIMEZONE=Asia/Kolkata
SEED_ON_START=true
AI_PROVIDER=fallback
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Frontend:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Never expose the Supabase secret key or an OpenAI secret in frontend variables.

## Google OAuth setup

1. In Google Cloud Console create a Web application OAuth client.
2. In Supabase Authentication → Providers → Google, enable Google and enter the Google Client ID and Client Secret.
3. In Google Cloud, use the Supabase Google provider callback URL as the OAuth redirect URI.
4. In Supabase Authentication → URL Configuration, set the Site URL to your public VenueHub frontend URL.
5. Add these VenueHub callback URLs to the Supabase allowed Redirect URLs:
   - `http://localhost:5173/auth/callback`
   - `https://YOUR_FRONTEND_DOMAIN/auth/callback`
6. In Google Cloud, add the frontend URL to Authorized JavaScript origins.

The app calls `supabase.auth.signInWithOAuth({ provider: 'google' })` and then syncs the authenticated identity with the VenueHub `users` table.

## SE-04 coverage

VenueHub covers the function-hall requirement with:

- customer Google registration/login
- venue listings with capacity, location, photos, facilities, pricing, and dates
- availability calendar/timeline
- date/time-slot bookings
- automatic double-booking prevention
- demo online payment workflow
- booking confirmation and digital receipt
- cancellation and refund workflow
- event categories such as wedding, birthday, conference, and reception
- catering, decoration, photography, sound, and seating services
- customer booking history
- admin dashboard
- maintenance and blocked dates
- in-app automated notifications
- booking and revenue analytics

The platform also adds AI venue recommendations, support contracts, service-resource conflict detection, venue-owner management, and a broader event operations model.

## AI Venue Advisor

The recommendation endpoint accepts event requirements such as:

- title and purpose
- event category
- expected attendees
- exact date/time
- preferred location
- required facilities/equipment
- required support services

It evaluates those requirements against live venue, booking, maintenance-block, service-contract, and pricing data.

With AI enabled:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

If the AI provider is unavailable, the system falls back to deterministic scoring and clearly labels the result `LOCAL FALLBACK`.

## Payments

The current checkout is a **demo payment flow** that records a transaction and generates a digital receipt. For real money, connect a production gateway such as Razorpay or Stripe and verify payments server-side before marking the booking paid.

## Deployment

See `DEPLOY_RENDER.md` for the complete Supabase + Google OAuth + Render deployment procedure.

The included `render.yaml` creates:

- `venuehub-api` — Express API
- `venuehub-web` — React/Vite static site

The frontend can be connected to the public API using `VITE_API_URL`, while the backend uses Supabase PostgreSQL/Auth and the exact frontend URL in `CORS_ORIGINS`.

## Security notes

- Google/Supabase access tokens are verified server-side.
- The secret Supabase key is backend-only.
- Role permissions are enforced on the API, not only in React.
- Helmet, compression, rate limiting, request-size limits, and CORS allowlisting are enabled.
- PostgreSQL exclusion constraints plus transaction locks prevent approved venue overlaps.
- No demo credentials are shipped.
