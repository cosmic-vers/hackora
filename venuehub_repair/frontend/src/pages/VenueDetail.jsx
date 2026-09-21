import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MapPin, Users2, CalendarPlus, Building2, Clock, ArrowLeft } from "lucide-react";
import Layout from "../components/Layout";
import AvailabilityTimeline from "../components/AvailabilityTimeline";
import EmptyState from "../components/EmptyState";
import { SkeletonLine } from "../components/Skeleton";
import client, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function humanDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function VenueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [venue, setVenue] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [availability, setAvailability] = useState({ bookedSlots: [] });
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    client
      .get(`/venues/${id}`)
      .then(({ data }) => setVenue(data.venue))
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!date) return;
    setLoadingSlots(true);
    client
      .get(`/venues/${id}/availability`, { params: { date } })
      .then(({ data }) => setAvailability(data))
      .catch((err) => toast.error(apiError(err, "Could not load availability.").message))
      .finally(() => setLoadingSlots(false));
  }, [id, date, toast]);

  if (loading) {
    return (
      <Layout title="Venue">
        <div className="card card-pad" style={{ maxWidth: 680 }}>
          <SkeletonLine width="50%" height={22} />
          <SkeletonLine width="80%" />
          <SkeletonLine width="70%" />
        </div>
      </Layout>
    );
  }

  if (missing || !venue) {
    return (
      <Layout title="Venue not found">
        <EmptyState
          icon={Building2}
          title="This venue is no longer listed"
          description="It may have been removed by an administrator."
          actionLabel="Back to venues"
          actionTo="/app/venues"
        />
      </Layout>
    );
  }

  const bookable = venue.status === "ACTIVE";

  return (
    <Layout
      title={venue.name}
      subtitle={`${venue.type} · ${venue.location}`}
      actions={
        <button
          className="btn btn-accent"
          disabled={!bookable}
          onClick={() => navigate(`/app/book?venueId=${venue.id}&date=${date}`)}
          title={bookable ? undefined : "This venue is not accepting bookings"}
        >
          <CalendarPlus size={16} /> Book this venue
        </button>
      }
    >
      <Link to="/app/venues" className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}>
        <ArrowLeft size={14} /> All venues
      </Link>

      {!bookable && (
        <div className="warning-banner">
          {venue.name} is currently marked{" "}
          {venue.status === "MAINTENANCE" ? "under maintenance" : "not bookable"}. Requests are paused
          until an administrator reopens it.
        </div>
      )}

      <div className="split-2">
        <div className="card card-pad">
          {venue.photos?.length ? (
            <div className="venue-photo-gallery" aria-label={`${venue.name} photos`}>
              {venue.photos.slice(0, 4).map((photo, index) => (
                <img
                  key={`${photo}-${index}`}
                  className="venue-photo"
                  src={photo}
                  alt={`${venue.name} view ${index + 1}`}
                  loading={index === 0 ? "eager" : "lazy"}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ))}
            </div>
          ) : (
            <div className="venue-card-media" style={{ borderRadius: 10, marginBottom: 18 }}>
              <Building2 />
            </div>
          )}

          <div className="price-total" style={{ marginBottom: 18 }}>
            <span>Venue price</span>
            <strong>₹{Number(venue.basePrice || 0).toLocaleString("en-IN")}</strong>
          </div>

          {venue.description && (
            <p style={{ color: "var(--slate)", lineHeight: 1.7, marginBottom: 18 }}>
              {venue.description}
            </p>
          )}

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 20 }}>
            <div className="venue-card-meta">
              <MapPin size={14} /> {venue.location}
            </div>
            <div className="venue-card-meta">
              <Users2 size={14} /> Holds {venue.capacity}
            </div>
            <div className="venue-card-meta">
              <Clock size={14} /> {venue.openTime}–{venue.closeTime}
            </div>
          </div>

          <div className="section-title">What's in the room</div>
          {venue.amenities.length === 0 ? (
            <p className="meta-line">No amenities listed for this venue.</p>
          ) : (
            <div className="venue-card-amenities">
              {venue.amenities.map((a) => (
                <span className="chip" key={a}>
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="section-title">Check a date</div>

          <div className="field">
            <label htmlFor="availability-date">Date</label>
            <input
              id="availability-date"
              type="date"
              value={date}
              min={todayStr()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {loadingSlots ? (
            <div className="skeleton" style={{ height: 96, borderRadius: 10 }} />
          ) : (
            <>
              <AvailabilityTimeline
                slots={availability.bookedSlots}
                blockedSlots={availability.blockedSlots || []}
                openTime={availability.openTime || venue.openTime}
                closeTime={availability.closeTime || venue.closeTime}
              />

              <div style={{ marginTop: 18 }}>
                {availability.bookedSlots.length === 0 && (availability.blockedSlots || []).length === 0 ? (
                  <p className="meta-line">
                    Completely free on {humanDate(date)} — the whole day is open.
                  </p>
                ) : (
                  <>
                    {(availability.blockedSlots || []).map((s, i) => (
                      <div className="slot-row" key={`blocked-${s.startTime}-${i}`}>
                        <span className="mono">{s.startTime}–{s.endTime}</span>
                        <span style={{ color: "var(--slate)", flex: 1, padding: "0 10px" }}>{s.reason || "Maintenance block"}</span>
                        <span className="badge badge-cancelled">Blocked</span>
                      </div>
                    ))}
                    {availability.bookedSlots.map((s, i) => (
                      <div className="slot-row" key={`${s.startTime}-${i}`}>
                        <span className="mono">{s.startTime}–{s.endTime}</span>
                        <span style={{ color: "var(--slate)", flex: 1, padding: "0 10px", minWidth: 0 }}>{s.title}</span>
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

              {bookable && (
                <button
                  className="btn btn-outline btn-block"
                  style={{ marginTop: 16 }}
                  onClick={() => navigate(`/app/book?venueId=${venue.id}&date=${date}`)}
                >
                  <CalendarPlus size={15} /> Request a slot on this date
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
