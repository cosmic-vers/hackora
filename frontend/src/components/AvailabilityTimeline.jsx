/**
 * A day seen at a glance: booked blocks drawn to scale across the venue's
 * opening hours, with the slot you are about to request overlaid on top.
 */
function toMinutes(time) {
  const [h, m] = (time || "00:00").split(":").map(Number);
  return h * 60 + m;
}

export default function AvailabilityTimeline({
  slots = [],
  blockedSlots = [],
  openTime = "08:00",
  closeTime = "21:00",
  selection = null,
}) {
  const start = toMinutes(openTime);
  const end = toMinutes(closeTime);
  const span = Math.max(60, end - start);

  const position = (from, to) => {
    const left = ((Math.max(toMinutes(from), start) - start) / span) * 100;
    const right = ((Math.min(toMinutes(to), end) - start) / span) * 100;
    return { left: `${left}%`, width: `${Math.max(right - left, 1.5)}%` };
  };

  const selectionVisible =
    selection &&
    selection.startTime &&
    selection.endTime &&
    toMinutes(selection.endTime) > toMinutes(selection.startTime);

  return (
    <div className="timeline">
      <div className="timeline-track">
        {blockedSlots.map((slot, i) => (
          <div
            key={`blocked-${slot.startTime}-${i}`}
            className="timeline-block blocked"
            style={{ ...position(slot.startTime, slot.endTime), top: 4, bottom: 4 }}
            title={`${slot.startTime}–${slot.endTime} · ${slot.reason || "Blocked"}`}
          >
            {slot.reason || "Blocked"}
          </div>
        ))}

        {slots.map((slot, i) => (
          <div
            key={`${slot.startTime}-${i}`}
            className={`timeline-block ${slot.status === "APPROVED" ? "approved" : "pending"}`}
            style={{ ...position(slot.startTime, slot.endTime), top: 4, bottom: 4 }}
            title={`${slot.startTime}–${slot.endTime} · ${slot.title}`}
          >
            {slot.title}
          </div>
        ))}

        {selectionVisible && (
          <div
            className="timeline-block selection"
            style={{ ...position(selection.startTime, selection.endTime), top: 0, bottom: 0 }}
            title={`Your request: ${selection.startTime}–${selection.endTime}`}
          >
            Your slot
          </div>
        )}
      </div>

      <div className="timeline-hours">
        <span>{openTime}</span>
        <span>{closeTime}</span>
      </div>

      <div className="timeline-legend">
        <span>
          <span className="legend-swatch" style={{ background: "var(--ivy)" }} />
          Confirmed
        </span>
        <span>
          <span
            className="legend-swatch"
            style={{ background: "var(--brass-soft)", border: "1px solid var(--brass)" }}
          />
          Awaiting approval
        </span>
        {blockedSlots.length > 0 && (
          <span>
            <span className="legend-swatch" style={{ background: "var(--ink-2)" }} />
            Maintenance / blocked
          </span>
        )}
        {selectionVisible && (
          <span>
            <span
              className="legend-swatch"
              style={{ background: "transparent", border: "2px dashed var(--ink-3)" }}
            />
            Your request
          </span>
        )}
      </div>
    </div>
  );
}
