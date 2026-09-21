import { Link } from "react-router-dom";

/** An empty screen is an invitation to act — never a dead end. */
export default function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction }) {
  return (
    <div className="empty-state">
      {Icon && <Icon />}
      <p style={{ color: "var(--ink)", fontWeight: 600, marginBottom: 4 }}>{title}</p>
      {description && <p style={{ maxWidth: "46ch", margin: "0 auto" }}>{description}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn btn-accent btn-sm" style={{ marginTop: 16 }}>
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button className="btn btn-accent btn-sm" style={{ marginTop: 16 }} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
