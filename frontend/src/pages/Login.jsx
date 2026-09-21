import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Field from "../components/Field";
import { useAuth } from "../context/AuthContext";
import { apiError } from "../api/client";

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@venuehub.edu", password: "Admin@123" },
  { role: "Faculty", email: "faculty@venuehub.edu", password: "Faculty@123" },
  { role: "Student", email: "student@venuehub.edu", password: "Student@123" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const next = params.get("next");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(next && next.startsWith("/app") ? next : "/app");
    } catch (err) {
      setError(apiError(err, "Could not log you in.").message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-side">
        <div className="landing-nav-brand">
          <img className="sidebar-brand-mark" src="/logo.jpeg" alt="" />
          <span className="landing-nav-name" style={{ color: "var(--paper)" }}>
            VenueHub
          </span>
        </div>
        <div className="auth-side-quote">
          No more chasing registers and phone calls to book a hall —{" "}
          <span>every request lives in one place.</span>
        </div>
        <p style={{ fontSize: 13, color: "rgba(247,244,236,0.6)" }}>
          Smart function hall booking & event management
        </p>
      </div>

      <div className="auth-form-wrap">
        <div className="auth-form-box">
          <h1>Welcome back</h1>
          <p className="auth-form-sub">Log in to search, book, and manage function halls.</p>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={submit} noValidate>
            <Field label="Email address">
              {(props) => (
                <input
                  {...props}
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@college.edu"
                  required
                />
              )}
            </Field>

            <Field label="Password">
              {(props) => (
                <input
                  {...props}
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              )}
            </Field>

            <button className="btn btn-accent btn-block" disabled={loading} type="submit">
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>

          <div className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </div>

          <div className="demo-creds">
            <b>Demo accounts</b> — click one to fill the form
            {DEMO_ACCOUNTS.map((account) => (
              <div key={account.email}>
                <button
                  type="button"
                  onClick={() => setForm({ email: account.email, password: account.password })}
                >
                  {account.role} — {account.email} / {account.password}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
