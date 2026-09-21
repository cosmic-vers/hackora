import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Field from "../components/Field";
import { useAuth } from "../context/AuthContext";
import { apiError } from "../api/client";

const ROLES = [
  { value: "STUDENT", label: "Student" },
  { value: "FACULTY", label: "Faculty" },
  { value: "CLUB", label: "Club" },
  { value: "DEPARTMENT", label: "Department" },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STUDENT",
    department: "",
    phone: "",
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});
    setLoading(true);
    try {
      await register(form);
      navigate("/app");
    } catch (err) {
      const { message, fields } = apiError(err, "Could not create your account.");
      setErrors(fields);
      setError(message);
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
          Every club, department, and classroom — <span>booked the same clear way.</span>
        </div>
        <p style={{ fontSize: 13, color: "rgba(247,244,236,0.6)" }}>
          Smart campus venue management
        </p>
      </div>

      <div className="auth-form-wrap">
        <div className="auth-form-box">
          <h1>Create your account</h1>
          <p className="auth-form-sub">Students, faculty, clubs, and departments can all book.</p>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={submit} noValidate>
            <Field label="Full name" error={errors.name}>
              {(props) => (
                <input
                  {...props}
                  value={form.name}
                  onChange={update("name")}
                  placeholder="Aarav Sharma"
                  required
                />
              )}
            </Field>

            <Field label="Email address" error={errors.email}>
              {(props) => (
                <input
                  {...props}
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={update("email")}
                  placeholder="you@college.edu"
                  required
                />
              )}
            </Field>

            <Field
              label="Password"
              error={errors.password}
              hint="At least 8 characters, with a letter and a number."
            >
              {(props) => (
                <input
                  {...props}
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={update("password")}
                  required
                />
              )}
            </Field>

            <div className="field-row">
              <Field label="I am a" error={errors.role}>
                {(props) => (
                  <select {...props} value={form.role} onChange={update("role")}>
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <Field label="Phone" error={errors.phone}>
                {(props) => (
                  <input
                    {...props}
                    value={form.phone}
                    onChange={update("phone")}
                    placeholder="9876543210"
                  />
                )}
              </Field>
            </div>

            <Field label="Department or club" error={errors.department}>
              {(props) => (
                <input
                  {...props}
                  value={form.department}
                  onChange={update("department")}
                  placeholder="Computer Science"
                />
              )}
            </Field>

            <button className="btn btn-accent btn-block" disabled={loading} type="submit">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="auth-switch">
            Already registered? <Link to="/login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
