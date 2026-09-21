import { Component } from "react";
import { AlertTriangle } from "lucide-react";

/** Keeps one broken screen from blanking the whole app. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <AlertTriangle size={40} style={{ color: "var(--brick)", margin: "0 auto 14px" }} />
        <h2 style={{ marginBottom: 8 }}>This screen stopped responding</h2>
        <p style={{ color: "var(--slate)", marginBottom: 20 }}>
          Reload the page to continue. If it keeps happening, tell your campus admin what you were doing.
        </p>
        <button className="btn btn-accent" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    );
  }
}
