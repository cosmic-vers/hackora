import axios from "axios";

export const TOKEN_KEY = "venuehub_token";
export const USER_KEY = "venuehub_user";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    const isAuthAttempt = url.includes("/auth/login") || url.includes("/auth/register");

    if (err.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (!window.location.pathname.startsWith("/login")) {
        // Keep where they were so they land back there after logging in.
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
      }
    }
    return Promise.reject(err);
  }
);

/**
 * Normalises an axios error into something a form can render:
 * { message, fields, conflicts }.
 */
export function apiError(err, fallback = "Something went wrong. Try again.") {
  if (err?.code === "ECONNABORTED") {
    return { message: "The server took too long to respond. Check your connection.", fields: {} };
  }
  if (!err?.response) {
    return { message: "Cannot reach the server. Check that the API is running.", fields: {} };
  }
  const data = err.response.data || {};
  return {
    message: data.message || fallback,
    fields: data.details || {},
    conflicts: data.conflicts || [],
    status: err.response.status,
  };
}

export default client;
