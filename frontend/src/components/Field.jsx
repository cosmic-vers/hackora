import { useId } from "react";

/**
 * Label + control + inline error, wired up for screen readers.
 * Pass `error` (a string) to mark the control invalid.
 */
export default function Field({ label, error, hint, children, htmlFor }) {
  const generatedId = useId();
  const id = htmlFor || generatedId;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({
        id,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
      })}
      {hint && !error && (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field-error" id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
