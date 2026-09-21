import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CalendarPlus, AlertTriangle, Sparkles, Users, FileText } from "lucide-react";
import Layout from "../components/Layout";
import Field from "../components/Field";
import AvailabilityTimeline from "../components/AvailabilityTimeline";
import client, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";

// Mirrors the categories the API accepts.
const CATEGORIES = [
  { value: "ACADEMIC", label: "Academic" },
  { value: "CULTURAL", label: "Cultural" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "SPORTS", label: "Sports" },
  { value: "MEETING", label: "Meeting" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "PLACEMENT", label: "Placement" },
  { value: "WEDDING", label: "Wedding" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "CONFERENCE", label: "Conference" },
  { value: "RECEPTION", label: "Reception" },
  { value: "OTHER", label: "Other" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function minutes(time) {
  const [h, m] = (time || "0:0").split(":").map(Number);
  return h * 60 + m;
}

function durationLabel(start, end) {
  const mins = minutes(end) - minutes(start);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h} hr` : null, m ? `${m} min` : null].filter(Boolean).join(" ");
}

export default function NewBooking() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [venues, setVenues] = useState([]);
  const [form, setForm] = useState({
    venueId: params.get("venueId") || "",
    title: "",
    category: "ACADEMIC",
    purpose: "",
    date: params.get("date") || todayStr(),
    startTime: "10:00",
    endTime: "12:00",
    expectedAttendees: "",
    seatingArrangement: "Theatre",
  });
  const [availability, setAvailability] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null); // { tone, text }
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    client
      .get("/venues", { params: { status: "ACTIVE" } })
      .then(({ data }) => setVenues(data.venues))
      .catch((err) => toast.error(apiError(err, "Could not load venues.").message));
  }, [toast]);

  // Show the day's existing bookings as soon as a venue and date are chosen.
  useEffect(() => {
    if (!form.venueId || !form.date) {
      setAvailability(null);
      return;
    }
    client
      .get(`/venues/${form.venueId}/availability`, { params: { date: form.date } })
      .then(({ data }) => setAvailability(data))
      .catch(() => setAvailability(null));
  }, [form.venueId, form.date]);

  // Load venue-specific support workers and active contracts as soon as a venue is chosen.
  useEffect(() => {
    setSelectedServices([]);
    if (!form.venueId) { setServices([]); return; }
    client
      .get("/services", { params: { venueId: form.venueId, status: "ACTIVE" } })
      .then(({ data }) => setServices(data.services || []))
      .catch(() => setServices([]));
  }, [form.venueId]);

  const selectedVenue = venues.find((v) => v.id === form.venueId);
  const duration = durationLabel(form.startTime, form.endTime);

  // Warn about clashes before the request is even sent.
  const localClash = useMemo(() => {
    if (!availability || minutes(form.endTime) <= minutes(form.startTime)) return null;
    const bookingClash = (availability.bookedSlots || []).find(
      (s) => minutes(s.startTime) < minutes(form.endTime) && minutes(form.startTime) < minutes(s.endTime)
    );
    if (bookingClash) return bookingClash;
    const blockedClash = (availability.blockedSlots || []).find(
      (s) => minutes(s.startTime) < minutes(form.endTime) && minutes(form.startTime) < minutes(s.endTime)
    );
    return blockedClash ? { ...blockedClash, status: "BLOCKED", title: blockedClash.reason || "Maintenance block" } : null;
  }, [availability, form.startTime, form.endTime]);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setBanner(null);
    setSubmitting(true);

    try {
      const payload = {
        ...form,
        expectedAttendees: form.expectedAttendees ? Number(form.expectedAttendees) : undefined,
        serviceIds: selectedServices,
        seatingArrangement: form.seatingArrangement,
      };
      const { data } = await client.post("/bookings", payload);
      toast.success("Request sent. You'll be notified once it's reviewed.");
      if (data.warning) toast.info(data.warning);
      navigate("/app/my-bookings");
    } catch (err) {
      const { message, fields, conflicts } = apiError(err, "Could not send your request.");
      setErrors(fields);
      setBanner({
        tone: "error",
        text: conflicts?.length
          ? `${message} Already taken: ${conflicts[0].startTime}–${conflicts[0].endTime} (${conflicts[0].title}).`
          : message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout
      title="Request a venue"
      subtitle="Send the details — venue operations admin reviews it and you'll hear back here."
    >
      <div className="split-2" style={{ alignItems: "start" }}>
        <div className="card card-pad">
          {banner && <div className="error-banner">{banner.text}</div>}

          <form onSubmit={submit} noValidate>
            <Field label="Venue" error={errors.venueId}>
              {(props) => (
                <select {...props} value={form.venueId} onChange={update("venueId")} required>
                  <option value="">Choose a venue</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {v.type} (holds {v.capacity})
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Seating arrangement">{(props) => (
              <select {...props} value={form.seatingArrangement} onChange={update("seatingArrangement")}>
                <option>Theatre</option><option>Classroom</option><option>Round tables</option><option>U-shape</option><option>Banquet</option><option>Custom</option>
              </select>
            )}</Field>

            {selectedVenue && (
              <p className="meta-line" style={{ marginTop: -10, marginBottom: 16 }}>
                {selectedVenue.location} · open {selectedVenue.openTime}–{selectedVenue.closeTime}
                {selectedVenue.amenities.length ? ` · ${selectedVenue.amenities.join(", ")}` : ""}
              </p>
            )}

            {selectedVenue && (
              <div className="service-picker">
                <div className="service-picker-head">
                  <div>
                    <div className="section-title" style={{ marginBottom: 4 }}><Sparkles size={16} /> On-site support & contracts</div>
                    <p className="meta-line">Book trusted venue staff along with the hall — design, cleaning, security, technical help and maintenance.</p>
                  </div>
                </div>
                {services.length === 0 ? (
                  <div className="service-empty"><FileText size={17} /> No active support contracts are listed for this venue.</div>
                ) : (
                  <div className="service-grid">
                    {services.map((service) => {
                      const checked = selectedServices.includes(service.id);
                      return (
                        <label className={`service-card ${checked ? "selected" : ""}`} key={service.id}>
                          <input type="checkbox" checked={checked} onChange={() => setSelectedServices(prev => checked ? prev.filter(id => id !== service.id) : [...prev, service.id])} />
                          <div className="service-card-main">
                            <div className="service-card-title">{service.name}</div>
                            <div className="service-provider"><Users size={14} /> {service.providerName}{service.role ? ` · ${service.role}` : ""}</div>
                            <div className="service-scope">{service.scope || "Contracted venue support"}</div>
                            <div className="service-contract"><FileText size={13} /> {service.contractRef || "Contract on file"} · ₹{Number(service.rate || 0).toLocaleString("en-IN")}/{service.billingUnit}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <Field label="Event title" error={errors.title}>
              {(props) => (
                <input
                  {...props}
                  value={form.title}
                  onChange={update("title")}
                  placeholder="Company product launch"
                  required
                />
              )}
            </Field>

            <div className="field-row">
              <Field label="Category" error={errors.category}>
                {(props) => (
                  <select {...props} value={form.category} onChange={update("category")}>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <Field
                label="Expected attendees"
                error={errors.expectedAttendees}
                hint={selectedVenue ? `Up to ${selectedVenue.capacity}` : undefined}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    min="1"
                    value={form.expectedAttendees}
                    onChange={update("expectedAttendees")}
                    placeholder="80"
                  />
                )}
              </Field>
            </div>

            <Field label="What is it for?" error={errors.purpose}>
              {(props) => (
                <textarea
                  {...props}
                  rows={3}
                  value={form.purpose}
                  onChange={update("purpose")}
                  placeholder="A short description helps admin decide faster."
                />
              )}
            </Field>

            <Field label="Date" error={errors.date}>
              {(props) => (
                <input
                  {...props}
                  type="date"
                  min={todayStr()}
                  value={form.date}
                  onChange={update("date")}
                  required
                />
              )}
            </Field>

            <div className="field-row">
              <Field label="Start time" error={errors.startTime}>
                {(props) => (
                  <input
                    {...props}
                    type="time"
                    value={form.startTime}
                    onChange={update("startTime")}
                    required
                  />
                )}
              </Field>

              <Field
                label="End time"
                error={errors.endTime}
                hint={duration ? `Runs for ${duration}` : undefined}
              >
                {(props) => (
                  <input
                    {...props}
                    type="time"
                    value={form.endTime}
                    onChange={update("endTime")}
                    required
                  />
                )}
              </Field>
            </div>

            {localClash && (
              <div className="warning-banner">
                <AlertTriangle size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                {localClash.status === "BLOCKED"
                  ? `That slot is blocked for ${localClash.reason || "maintenance"} (${localClash.startTime}–${localClash.endTime}). Pick another time.`
                  : localClash.status === "APPROVED"
                    ? `That slot is already booked (${localClash.startTime}–${localClash.endTime}). Pick another time.`
                    : `Someone else has requested ${localClash.startTime}–${localClash.endTime}. You can still ask — whichever is approved first gets the room.`}
              </div>
            )}

            <button
              className="btn btn-accent btn-block"
              disabled={submitting || localClash?.status === "APPROVED" || localClash?.status === "BLOCKED"}
              type="submit"
            >
              <CalendarPlus size={16} /> {submitting ? "Sending…" : "Send request"}
            </button>
          </form>
        </div>

        <div className="card card-pad">
          <div className="section-title">That day at a glance</div>
          {!selectedVenue ? (
            <p className="meta-line">Choose a venue to see what is already booked.</p>
          ) : (
            <>
              <AvailabilityTimeline
                slots={availability?.bookedSlots || []}
                blockedSlots={availability?.blockedSlots || []}
                openTime={availability?.openTime || selectedVenue.openTime}
                closeTime={availability?.closeTime || selectedVenue.closeTime}
                selection={{ startTime: form.startTime, endTime: form.endTime }}
              />
              <div style={{ marginTop: 16 }}>
                {(availability?.bookedSlots || []).length === 0 && (availability?.blockedSlots || []).length === 0 ? (
                  <p className="meta-line">Nothing booked yet — the day is open to claim.</p>
                ) : (
                  <>
                    {(availability?.blockedSlots || []).map((s, i) => (
                      <div className="slot-row" key={`blocked-${s.startTime}-${i}`}>
                        <span className="mono">{s.startTime}–{s.endTime}</span>
                        <span style={{ color: "var(--slate)", flex: 1, padding: "0 10px" }}>{s.reason || "Maintenance block"}</span>
                        <span className="badge badge-cancelled">Blocked</span>
                      </div>
                    ))}
                    {(availability?.bookedSlots || []).map((s, i) => (
                      <div className="slot-row" key={`${s.startTime}-${i}`}>
                        <span className="mono">{s.startTime}–{s.endTime}</span>
                        <span
                          className={`badge ${s.status === "APPROVED" ? "badge-approved" : "badge-pending"}`}
                        >
                          {s.status === "APPROVED" ? "Booked" : "Requested"}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
