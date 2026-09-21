import { Link } from "react-router-dom";
import {
  CalendarCheck2,
  ShieldAlert,
  BarChart3,
  Building2,
  Bell,
  Users,
} from "lucide-react";

const FEATURES = [
  {
    icon: CalendarCheck2,
    title: "Real-time availability",
    text: "See every hall, classroom, and auditorium's open slots the moment they change — no more calling the office to check.",
  },
  {
    icon: ShieldAlert,
    title: "Automatic conflict detection",
    text: "Double-bookings are caught before they happen. Overlapping requests are flagged and resolved before approval.",
  },
  {
    icon: Bell,
    title: "Structured approvals",
    text: "Requests route straight to admins with everything they need — purpose, headcount, and department — for a fast decision.",
  },
  {
    icon: BarChart3,
    title: "Utilization analytics",
    text: "Track which venues are in demand, which sit idle, and how booking volume shifts across the term.",
  },
  {
    icon: Building2,
    title: "One venue directory",
    text: "Auditoriums, seminar halls, function halls, and classrooms — capacity, amenities, and location in a single catalog.",
  },
  {
    icon: Users,
    title: "Built for every role",
    text: "Students, faculty, clubs, departments, and admins each get a workflow suited to how they actually book space.",
  },
];

export default function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <img className="landing-nav-mark" src="/logo.jpeg" alt="VenueHub" />
          <span className="landing-nav-name">VenueHub</span>
        </div>
        <div className="landing-nav-links">
          <Link to="/login" className="btn btn-ghost">
            Log in
          </Link>
          <Link to="/register" className="btn btn-primary">
            Get started
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div>
          <div className="landing-eyebrow">
            <span className="dot" /> Smart function hall booking
          </div>
          <h1>
            Book smarter.
            <br />
            Manage better.
            <br />
            <span className="accent">Make every event run smoother.</span>
          </h1>
          <p className="landing-hero-sub">
            VenueHub replaces registers, WhatsApp threads, and phone calls with one system for
            discovering, booking, and managing function halls and event spaces — with conflicts caught
            automatically.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="btn btn-accent">
              Create your account
            </Link>
            <Link to="/login" className="btn btn-outline">
              I already have an account
            </Link>
          </div>
          <div className="landing-hero-stats">
            <div className="landing-hero-stat">
              <b>6+</b>
              <span>Venue categories</span>
            </div>
            <div className="landing-hero-stat">
              <b>&lt;1 min</b>
              <span>To submit a request</span>
            </div>
            <div className="landing-hero-stat">
              <b>0</b>
              <span>Double-bookings</span>
            </div>
          </div>
        </div>

        <div className="landing-hero-visual">
          <div className="mock-card">
            <div className="mock-card-top">
              <span className="mock-card-title">Kalam Auditorium</span>
              <span className="badge badge-approved">Approved</span>
            </div>
            <div className="mock-schedule-row">
              <span className="mock-schedule-time">09:00–11:00</span>
              <span>Convocation rehearsal</span>
            </div>
            <div className="mock-schedule-row">
              <span className="mock-schedule-time">14:00–17:00</span>
              <span>Tech fest — opening ceremony</span>
            </div>
          </div>
          <div className="mock-card">
            <div className="mock-card-top">
              <span className="mock-card-title">This week's utilization</span>
              <span style={{ fontSize: 12, color: "var(--slate)" }}>82%</span>
            </div>
            <div className="mock-bar">
              <div className="mock-bar-fill" style={{ width: "82%" }} />
            </div>
            <div className="mock-bar" style={{ marginTop: 12 }}>
              <div className="mock-bar-fill" style={{ width: "54%", background: "var(--ivy)" }} />
            </div>
            <div className="mock-bar" style={{ marginTop: 12 }}>
              <div className="mock-bar-fill" style={{ width: "31%", background: "var(--ink-3)" }} />
            </div>
          </div>
          <div className="mock-card" style={{ marginBottom: 0 }}>
            <div className="mock-card-top">
              <span className="mock-card-title">Pending approvals</span>
              <span className="badge badge-pending">3 new</span>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--slate)" }}>
              Robotics Club requested Function Hall A for Sat, 10:00–13:00.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <h2>Everything you need to run an event space</h2>
          <p>
            From the first search to the final approval, VenueHub keeps venue booking transparent
            for everyone involved.
          </p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-card-icon">
                <f.icon />
              </div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="role-strip">
          <div className="role-item">
            <b>Students</b>
            <span>Book classrooms and halls for club activities, projects, and events in minutes.</span>
          </div>
          <div className="role-item">
            <b>Faculty</b>
            <span>Reserve seminar halls for lectures, guest talks, and department sessions.</span>
          </div>
          <div className="role-item">
            <b>Clubs</b>
            <span>Coordinate fests and celebrations without chasing approvals over chat.</span>
          </div>
          <div className="role-item">
            <b>Departments</b>
            <span>Plan recurring academic use around other campus activity, conflict-free.</span>
          </div>
          <div className="role-item">
            <b>Admins</b>
            <span>Approve, reject, and track every venue from a single control center.</span>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <h2>Stop managing venues by memory.</h2>
        <p>Bring your halls, services, bookings, and operations into one real-time platform.</p>
        <Link to="/register" className="btn btn-accent">
          Get started for free
        </Link>
      </section>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} VenueHub — Function Hall Booking & Event Management</span>
        <span>Smart booking • Clear availability • Better event operations</span>
      </footer>
    </div>
  );
}
