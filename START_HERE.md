# VenueHub — SE-04 Start Here

## 1. Backend

```bash
cd backend
npm install
npm run dev
```

Backend: `http://localhost:5000`
Health check: `http://localhost:5000/api/health`

## 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Demo accounts

- Admin: `admin@venuehub.edu` / `Admin@123`
- Faculty: `faculty@venuehub.edu` / `Faculty@123`
- Student: `student@venuehub.edu` / `Student@123`
- Club: `club@venuehub.edu` / `Club@123`

## AI Venue Advisor

The project works without an external AI key using the transparent local recommendation fallback.

To enable the OpenAI ranking/explanation layer, edit `backend/.env`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

## Notes

- The bundled `backend/.env` is for local development only. Replace the JWT secret before deployment.
- The online payment flow is intentionally a demo/sandbox flow; connect Razorpay/Stripe before processing real money.
- `node_modules` is intentionally excluded from the ZIP. Run `npm install` in both folders.


## Go live

This repo is deployment-ready for Render's **free** tier — no credit card or paid plan needed. See `DEPLOY_RENDER.md` and `render.yaml`. The frontend is a React/Vite static site and the API is a Node/Express service; SQLite data lives on the free service's local disk, which resets on redeploy or after the service sleeps from inactivity (demo accounts auto-reseed on every restart).
