# VenueHub — Production Deployment

VenueHub is now a general-purpose function-hall and event-venue platform for multiple organisations, venue owners, and cities.

Production architecture:

- **Frontend:** React + Vite on Render Static Site
- **Backend:** Node.js + Express on Render Web Service
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth + Google OAuth
- **AI:** Optional OpenAI API, with a transparent local recommendation fallback

## 1. Create the Supabase project

Create a project at https://supabase.com/.

Then open **SQL Editor** and run the complete file:

`supabase/schema.sql`

From Supabase project settings, note:

- Project URL → `SUPABASE_URL`
- Publishable key → frontend `VITE_SUPABASE_PUBLISHABLE_KEY`
- Secret key (`sb_secret_...`) → backend `SUPABASE_SECRET_KEY` (never expose this to the browser)
- PostgreSQL Session Pooler connection string → backend `DATABASE_URL`

## 2. Configure Google Login

In Google Cloud Console create a **Web application OAuth client**.

Google OAuth configuration should use:

- Authorized JavaScript origin: your VenueHub frontend URL
- Authorized redirect URI: the Supabase Google provider callback URL shown in Supabase Auth → Providers → Google

In Supabase:

- Enable **Google** under Authentication → Providers
- Paste the Google Client ID and Client Secret
- Set the project Site URL to the production frontend URL
- Add the local callback and production callback to Redirect URLs:
  - `http://localhost:5173/auth/callback`
  - `https://YOUR_FRONTEND_DOMAIN/auth/callback`

The browser calls `supabase.auth.signInWithOAuth({ provider: 'google' })`. The backend verifies the resulting Supabase access token before allowing protected API requests.

## 3. Push to GitHub

At the repository root:

```bash
git init
git add .
git commit -m "VenueHub production architecture"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## 4. Deploy with Render

Create a Render **Blueprint** from the GitHub repository. Render reads `render.yaml` and creates:

- `venuehub-api`
- `venuehub-web`

Set these backend variables in Render:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `CORS_ORIGINS` → exact public frontend URL
- `ADMIN_EMAILS` → comma-separated Google email addresses that should become admins
- `AI_PROVIDER` → `openai` or `fallback`
- `OPENAI_API_KEY` → only when AI is enabled

Set these frontend variables:

- `VITE_API_URL` → exact public API URL plus `/api`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never put `SUPABASE_SECRET_KEY` or `OPENAI_API_KEY` into frontend environment variables.

## 5. First production login

There are **no demo passwords** anymore.

Every account is created through Google. The first Google sign-in creates a `CUSTOMER` account automatically. Addresses listed in `ADMIN_EMAILS` are promoted to `ADMIN` by the backend.

## 6. Venue owners

Venue owners use Google login too. An admin can promote a user to `VENUE_OWNER` through the admin role-management workflow once owner onboarding is enabled.

## 7. Health check

After deployment, verify:

`https://YOUR_API_DOMAIN/api/health`

A healthy API returns JSON containing:

```json
{"status":"ok","service":"VenueHub API","database":"postgresql"}
```

## 8. Payments

The project contains a demo checkout flow for the SE-04 prototype. For production payments, replace the demo adapter with Razorpay/Stripe and verify payment signatures server-side before marking a booking as paid.
