import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Chrome, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiError } from "../api/client";
import { supabase } from "../supabase";

export default function Login() {
  const { user, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const next = params.get("next") || "/app";
      navigate(next.startsWith("/") ? next : "/app", { replace: true });
    }
  }, [user, navigate, params]);

  const submit = async () => {
    setLoading(true); setError("");
    try { await loginWithGoogle(); }
    catch (err) { setError(apiError(err, "Google sign-in could not be started.").message); setLoading(false); }
  };

  return (
    <div className="auth-screen">
      <div className="auth-side">
        <div className="landing-nav-brand"><img className="sidebar-brand-mark" src="/logo.jpeg" alt="" /><span className="landing-nav-name" style={{ color: "var(--paper)" }}>VenueHub</span></div>
        <div className="auth-side-quote">Find the right hall. <span>Book it without the back-and-forth.</span></div>
        <p style={{ fontSize: 13, color: "rgba(247,244,236,0.6)" }}>Smart function hall booking & event management</p>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-form-box">
          <h1>Welcome to VenueHub</h1>
          <p className="auth-form-sub">Use your Google account to create or access your VenueHub account.</p>
          {error && <div className="error-banner">{error}</div>}
          <button className="btn btn-accent btn-block" disabled={loading} type="button" onClick={submit}>
            <Chrome size={18} /> {loading ? "Redirecting to Google…" : "Continue with Google"}
          </button>
          <div className="auth-trust"><ShieldCheck size={16}/><span>Secure OAuth sign-in. No VenueHub password to remember.</span></div>
          <div className="auth-switch">By continuing, you agree to use a Google identity you control.</div>
          <div className="auth-switch"><Link to="/">Back to VenueHub</Link></div>
        </div>
      </div>
    </div>
  );
}
