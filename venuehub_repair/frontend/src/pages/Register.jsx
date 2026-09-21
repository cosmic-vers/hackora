import { useAuth } from "../context/AuthContext";
import { Chrome, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { apiError } from "../api/client";

export default function Register() {
  const { loginWithGoogle } = useAuth();
  const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  const go=async()=>{setError("");setLoading(true);try{await loginWithGoogle();}catch(e){setError(apiError(e,"Google sign-up could not be started.").message);setLoading(false);}};
  return <div className="auth-screen"><div className="auth-side"><div className="landing-nav-brand"><img className="sidebar-brand-mark" src="/logo.jpeg" alt=""/><span className="landing-nav-name" style={{color:"var(--paper)"}}>VenueHub</span></div><div className="auth-side-quote">One account. <span>Every venue you need.</span></div><p style={{fontSize:13,color:"rgba(247,244,236,0.6)"}}>Book function halls, manage events, and keep every detail in one place.</p></div><div className="auth-form-wrap"><div className="auth-form-box"><h1>Create your VenueHub account</h1><p className="auth-form-sub">Registration is automatic when you continue with Google.</p>{error&&<div className="error-banner">{error}</div>}<button className="btn btn-accent btn-block" disabled={loading} onClick={go}><Chrome size={18}/>{loading?"Redirecting to Google…":"Sign up with Google"}</button><div className="auth-switch"><Link to="/login"><ArrowLeft size={14}/> Already have an account? Sign in</Link></div></div></div></div>;
}
