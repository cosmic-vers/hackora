import axios from "axios";
import { supabase } from "../supabase";

export const TOKEN_KEY = "venuehub_supabase_session";
export const USER_KEY = "venuehub_user";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  // Render's free tier spins the API down after ~15 minutes idle; the next
  // request has to cold-start the instance (often 30-50s) before it can
  // even reach our own route handlers. 20s was cutting that off mid-boot,
  // which is exactly what "server not responding" on Confirm/Pay felt like.
  timeout: 55000,
});

/**
 * Fire a lightweight, no-auth request to wake a sleeping free-tier instance.
 * Call this as early as possible (app mount, login) so the cold start
 * happens in the background while the person is still filling out a form,
 * not at the moment they hit Confirm/Approve/Pay.
 */
export function warmUpApi() {
  const base = import.meta.env.VITE_API_URL || "/api";
  const healthUrl = base.replace(/\/api\/?$/, "/api/health");
  fetch(healthUrl, { mode: "cors", cache: "no-store" }).catch(() => {});
}

client.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    if (err.response?.status === 401 && !url.includes("/auth/me")) {
      localStorage.removeItem(USER_KEY);
      if (!window.location.pathname.startsWith("/login")) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
      }
    }
    return Promise.reject(err);
  }
);

export function apiError(err, fallback = "Something went wrong. Try again.") {
  if (err?.code === "ECONNABORTED") return { message: "The server is taking a while to respond — it may be waking up after being idle. Please try again in a moment.", fields: {} };
  if (!err?.response) return { message: "Cannot reach VenueHub API right now. It may be waking up after being idle — please try again in a moment.", fields: {} };
  const data = err.response.data || {};
  return { message: data.message || fallback, fields: data.details || {}, conflicts: data.conflicts || [], status: err.response.status };
}

export default client;
