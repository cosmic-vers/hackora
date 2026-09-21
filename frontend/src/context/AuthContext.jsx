import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import client, { TOKEN_KEY, USER_KEY } from "../api/client";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function persist(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function forget() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(true);

  // Revalidate the stored session on boot so a deleted or expired account
  // never lingers in the UI.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return;
    }
    client
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        persist(null, data.user);
      })
      .catch(() => {
        forget();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await client.post("/auth/login", { email, password });
    persist(data.token, data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await client.post("/auth/register", payload);
    persist(data.token, data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const updateUser = useCallback((next) => {
    setUser(next);
    persist(null, next);
  }, []);

  const updateToken = useCallback((token) => persist(token, null), []);

  const logout = useCallback(() => {
    forget();
    setUser(null);
    window.location.href = "/login";
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateUser, updateToken }),
    [user, loading, login, register, logout, updateUser, updateToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
