# VenueHub — Start Here

VenueHub is a general function-hall and event-venue booking platform designed to serve multiple venues, organisations, cities, and event organisers.

## Stack

- React + Vite frontend
- Node.js + Express API
- Supabase PostgreSQL database
- Supabase Auth with Google OAuth
- Optional OpenAI AI recommendations

## Local setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend

Open a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Then open `http://localhost:5173`.

## Required environment variables

Backend `.env`:

```env
PORT=5000
DATABASE_URL=YOUR_SUPABASE_POSTGRES_CONNECTION_STRING
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SUPABASE_SECRET_KEY
CORS_ORIGINS=http://localhost:5173
ADMIN_EMAILS=your-google-email@example.com
APP_TIMEZONE=Asia/Kolkata
AI_PROVIDER=fallback
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
SEED_ON_START=true
```

Frontend `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

## Database

Run `supabase/schema.sql` once in the Supabase SQL Editor.

The backend also runs the schema initialization on startup, so the deployment can self-check that the required tables exist.

## Authentication

There are **no demo accounts and no VenueHub passwords**. Users sign in with Google. The backend creates or updates the application profile on the first authenticated API request.

## Production deployment

See `DEPLOY_RENDER.md` for the exact Supabase + Google OAuth + Render setup.
