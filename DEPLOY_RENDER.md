# VenueHub — Live Deployment (Free Tier)

This project is prepared for deployment with **Render** on its **free** plan: a React/Vite static frontend (always free on Render) and a Node/Express API on Render's free web service plan. Both cost $0 and don't require a credit card.

**Trade-off to know:** the API's SQLite database now lives on the service's local, ephemeral disk instead of a paid persistent disk. That means:
- Data survives fine across ordinary traffic and warm restarts.
- Data is **wiped** whenever the service redeploys, or spins down from inactivity and cold-starts again. Render's free web services sleep after ~15 minutes with no traffic and take ~30–60 seconds to wake back up on the next request.
- `SEED_ON_START=true` means every fresh start reseeds the demo accounts and sample venues automatically, so the app always comes back up in a usable, demo-ready state — it just won't remember bookings/users created since the last restart.

This is a good fit for a portfolio piece, hackathon submission, or demo link. If you later need bookings and accounts to persist permanently, the cheapest upgrade path is adding a free-tier hosted database (e.g. Turso for SQLite-compatible storage, or Supabase/Neon for Postgres) rather than paying for Render's persistent disk — ask if you want help wiring that in.

## 1. Push the project to GitHub

Create a new repository and push the contents of this folder. The repository root must contain `render.yaml`, `frontend/`, and `backend/`.

## 2. Create the Render Blueprint

In Render, choose **New → Blueprint** and connect the GitHub repository. Render will read `render.yaml` and create:

- `venuehub-api` — Express API (free web service plan)
- `venuehub-web` — React/Vite frontend (static site, always free)

No paid plan or disk is provisioned — confirm the plan selector shows **Free** for `venuehub-api` before you click "Apply". The API uses `/api/health` as its health check.

## 3. Secrets

Render generates `JWT_SECRET` automatically. Set `OPENAI_API_KEY` only when you want live AI recommendations. Set `AI_PROVIDER=openai` to enable the OpenAI path; otherwise the application uses its transparent local recommendation fallback.

Never commit a real `.env` file or API keys.

## 4. After the first deployment

Open:

- Frontend: `https://venuehub-web.onrender.com`
- API health: `https://venuehub-api.onrender.com/api/health`

If you rename either Render service, update `VITE_API_URL` on the frontend and `CORS_ORIGINS` on the API to the actual URLs, then redeploy.

## 5. Demo accounts

The seed system creates demo accounts on startup:

- Admin — `admin@venuehub.edu` / `Admin@123`
- Faculty — `faculty@venuehub.edu` / `Faculty@123`
- Student — `student@venuehub.edu` / `Student@123`
- Club — `club@venuehub.edu` / `Club@123`

For a real production deployment, change or remove these accounts and set `SEED_ON_START=false` after creating your real administrator.

## 6. Payments

The current booking flow contains a **demo payment gateway**, suitable for a hackathon prototype. A production deployment should replace that adapter with a real provider such as Razorpay or Stripe and verify payments server-side before marking a booking paid.
