import { useEffect } from "react";

/** Replaces window.confirm so destructive actions match the rest of the UI. */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Keep it",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel} role="presentation">
      <div
        className="modal-box"
        style={{ maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        {body && <p style={{ fontSize: 14, color: "var(--slate)", marginBottom: 20 }}>{body}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline btn-block" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className={`btn btn-block ${tone === "danger" ? "" : "btn-accent"}`}
            style={tone === "danger" ? { background: "var(--brick)", color: "#fff" } : undefined}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
