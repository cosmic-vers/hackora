import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.warn("[VenueHub] Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before using Google login.");
}

export const supabase = createClient(url || "https://placeholder.supabase.co", key || "placeholder", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
