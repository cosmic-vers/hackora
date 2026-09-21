import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import client, { USER_KEY } from "../api/client";
import { supabase } from "../supabase";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function persistUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncSession = useCallback(async (nextSession) => {
    if (!nextSession?.access_token) {
      setUser(null);
      persistUser(null);
      return null;
    }

    const { data } = await client.get("/auth/me");
    setUser(data.user);
    persistUser(data.user);
    return data.user;
  }, []);

  // Keep the Supabase auth callback lightweight. The API sync runs in a separate
  // effect so no network call is made from inside onAuthStateChange itself.
  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => {
        if (mounted) setSession(currentSession);
      })
      .catch(() => {
        if (mounted) setSession(null);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!session) {
      setUser(null);
      persistUser(null);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    syncSession(session)
      .catch(() => {
        if (mounted) {
          setUser(null);
          persistUser(null);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [session, syncSession]);

  const loginWithGoogle = useCallback(async () => {
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) throw error;
  }, []);

  const updateUser = useCallback((next) => {
    setUser(next);
    persistUser(next);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    persistUser(null);
    setUser(null);
    setSession(null);
    window.location.href = "/";
  }, []);

  const value = useMemo(
    () => ({ user, loading, loginWithGoogle, logout, updateUser }),
    [user, loading, loginWithGoogle, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
