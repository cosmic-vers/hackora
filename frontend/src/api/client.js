import axios from "axios";
import { supabase } from "../supabase";

export const TOKEN_KEY = "venuehub_supabase_session";
export const USER_KEY = "venuehub_user";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 20000,
});

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
  if (err?.code === "ECONNABORTED") return { message: "The server took too long to respond. Check your connection.", fields: {} };
  if (!err?.response) return { message: "Cannot reach VenueHub API. Check the deployment or API URL.", fields: {} };
  const data = err.response.data || {};
  return { message: data.message || fallback, fields: data.details || {}, conflicts: data.conflicts || [], status: err.response.status };
}

export default client;
