import { useEffect, useState } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  CalendarPlus,
  ClipboardList,
  BarChart3,
  Users,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Sun,
  Moon,
  UserCircle2,
  FileText,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import NotificationBell from "./NotificationBell";

const requesterLinks = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/venues", label: "Browse venues", icon: Building2 },
  { to: "/app/book", label: "New booking", icon: CalendarPlus },
  { to: "/app/ai-recommend", label: "AI Venue Advisor", icon: Sparkles },
  { to: "/app/my-bookings", label: "My bookings", icon: ClipboardList },
  { to: "/app/refunds", label: "Refunds", icon: RotateCcw },
];

const adminLinks = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/venues", label: "Browse venues", icon: Building2 },
  { to: "/app/admin/bookings", label: "Requests", icon: ClipboardList },
  { to: "/app/refunds", label: "Refunds", icon: RotateCcw },
  { to: "/app/admin/venues", label: "Venues", icon: ShieldCheck },
  { to: "/app/admin/services", label: "Support contracts", icon: FileText },
  { to: "/app/admin/blocks", label: "Maintenance & blocks", icon: ShieldCheck },
  { to: "/app/admin/users", label: "People", icon: Users },
  { to: "/app/admin/analytics", label: "Analytics", icon: BarChart3 },
];

const ownerLinks = [
  ...requesterLinks,
  { to: "/app/admin/venues", label: "My venues", icon: ShieldCheck },
];

function initials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Layout({ title, subtitle, actions, children }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  const links = ["ADMIN", "SUPER_ADMIN"].includes(user?.role) ? adminLinks : user?.role === "VENUE_OWNER" ? ownerLinks : requesterLinks;

  // Close the drawer whenever navigation happens.
  useEffect(() => setNavOpen(false), [location.pathname]);

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {navOpen && <div className="drawer-scrim" onClick={() => setNavOpen(false)} />}

      <aside className={`sidebar ${navOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <img className="sidebar-brand-mark" src="/logo.jpeg" alt="" />
          <div className="sidebar-brand-text">VenueHub</div>
          <button
            className="icon-btn menu-toggle"
            style={{ marginLeft: "auto", background: "transparent", borderColor: "transparent", color: "inherit" }}
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
          >
            <X />
          </button>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
            >
              <link.icon />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link to="/app/profile" className="sidebar-user" style={{ borderRadius: "var(--radius-sm)" }}>
            <div className="sidebar-avatar">{initials(user?.name)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">{user?.role?.toLowerCase()}</div>
            </div>
          </Link>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={15} /> Log out
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <button
              className="icon-btn menu-toggle"
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
              aria-expanded={navOpen}
            >
              <Menu />
            </button>
            <div style={{ minWidth: 0 }}>
              <h1 className="topbar-title">{title}</h1>
              {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
            </div>
          </div>

          <div className="topbar-actions">
            {actions}
            <NotificationBell />
            <button
              className="icon-btn"
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </button>
            <Link to="/app/profile" className="icon-btn" aria-label="Your profile">
              <UserCircle2 />
            </Link>
          </div>
        </header>

        <main className="page-body" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}
