# VenueHub — Live Deployment

This project is prepared for a real deployment with **Render**: a React/Vite static frontend and a Node/Express API. The API uses SQLite, so the Render API service is configured with a persistent disk at `/var/data`. Render documents that ordinary service filesystems are ephemeral and that persistent disks preserve files across deploys/restarts; persistent disks require a paid compatible service and keep the service to one instance.

## 1. Push the project to GitHub

Create a new repository and push the contents of this folder. The repository root must contain `render.yaml`, `frontend/`, and `backend/`.

## 2. Create the Render Blueprint

In Render, choose **New → Blueprint** and connect the GitHub repository. Render will read `render.yaml` and create:

- `venuehub-api` — Express API
- `venuehub-web` — React/Vite frontend
- a 1 GB persistent disk for the SQLite database

The API uses `/api/health` as its health check.

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
