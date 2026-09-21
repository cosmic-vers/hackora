import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: "44ch" }}>
        <Compass size={42} style={{ color: "var(--brass)", margin: "0 auto 16px" }} />
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>That page isn't here</h1>
        <p style={{ color: "var(--slate)", marginBottom: 22 }}>
          The link may be out of date, or the booking it pointed to was removed.
        </p>
        <Link to="/app" className="btn btn-accent">
          Go to your dashboard
        </Link>
      </div>
    </div>
  );
}
