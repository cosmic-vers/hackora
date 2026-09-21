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
    text: "See every function hall, banquet venue, auditorium, and event space's open slots the moment they change — no more calling the office to check.",
  },
  {
    icon: ShieldAlert,
    title: "Automatic conflict detection",
    text: "Double-bookings are caught before they happen. Overlapping requests are flagged and resolved before approval.",
  },
  {
    icon: Bell,
    title: "Structured approvals",
    text: "Requests route straight to admins with everything they need — purpose, headcount, and organization — for a fast decision.",
  },
  {
    icon: BarChart3,
    title: "Utilization analytics",
    text: "Track which venues are in demand, which sit idle, and how booking volume shifts across the season.",
  },
  {
    icon: Building2,
    title: "One venue directory",
    text: "Function halls, banquet spaces, conference venues, and event spaces — capacity, amenities, and location in a single catalog.",
  },
  {
    icon: Users,
    title: "Built for every role",
    text: "Customers, venue owners, and administrators each get a workflow suited to how they actually book space.",
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
              <span className="mock-card-title">Grand Celebration Hall</span>
              <span className="badge badge-approved">Approved</span>
            </div>
            <div className="mock-schedule-row">
              <span className="mock-schedule-time">09:00–11:00</span>
              <span>Wedding setup</span>
            </div>
            <div className="mock-schedule-row">
              <span className="mock-schedule-time">14:00–17:00</span>
              <span>Annual conference — opening session</span>
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
              Apex Events requested Grand Celebration Hall for Sat, 10:00–13:00.
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
            <b>Customers</b>
            <span>Compare function halls and event spaces, then book the right one in minutes.</span>
          </div>
          <div className="role-item">
            <b>Venue owners</b>
            <span>Manage availability, pricing, services, and bookings for every venue you own.</span>
          </div>
          <div className="role-item">
            <b>Event organizers</b>
            <span>Coordinate weddings, conferences, celebrations, launches, and private events in one place.</span>
          </div>
          <div className="role-item">
            <b>Organizations</b>
            <span>Organize recurring events, preferred venues, service partners, and schedules without conflicts.</span>
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
