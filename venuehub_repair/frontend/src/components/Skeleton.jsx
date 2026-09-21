/** Placeholder shapes shown while data loads, so the page does not jump. */
export function SkeletonLine({ width = "100%", height = 14, style }) {
  return <div className="skeleton" style={{ width, height, marginBottom: 10, ...style }} />;
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div className="grid-stats">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton skeleton-card" key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="card card-pad">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: "flex", gap: 16, marginBottom: 14 }}>
          {Array.from({ length: cols }).map((__, c) => (
            <div
              className="skeleton"
              key={c}
              style={{ height: 14, flex: c === 0 ? 2 : 1, borderRadius: 4 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 6 }) {
  return (
    <div className="venue-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton" key={i} style={{ height: 280, borderRadius: 10 }} />
      ))}
    </div>
  );
}
