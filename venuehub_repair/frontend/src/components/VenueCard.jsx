import { Link } from "react-router-dom";
import { Users2, MapPin, Building2, Clock } from "lucide-react";

const STATUS_LABEL = {
  MAINTENANCE: "Under maintenance",
  INACTIVE: "Not bookable",
};

export default function VenueCard({ venue }) {
  return (
    <Link to={`/app/venues/${venue.id}`} className="venue-card">
      <div className="venue-card-media" style={{backgroundImage:`linear-gradient(135deg, rgba(9,18,32,.15), rgba(9,18,32,.7)), url(${venue.photos?.[0] || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80"})`}}>
        <span className="venue-card-type">{venue.type}</span>
        <Building2 />
      </div>

      <div className="venue-card-body">
        <div className="venue-card-title">{venue.name}</div>
        <div className="venue-card-meta">
          <MapPin size={13} /> {venue.location}
        </div>
        <div className="venue-card-meta">
          <Clock size={13} /> Open {venue.openTime}–{venue.closeTime}
        </div>
        {venue.description && (
          <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.5 }}>
            {venue.description.slice(0, 90)}
            {venue.description.length > 90 ? "…" : ""}
          </p>
        )}
        <div className="venue-card-amenities">
          {(venue.amenities || []).slice(0, 3).map((a) => (
            <span className="chip" key={a}>
              {a}
            </span>
          ))}
          {venue.amenities?.length > 3 && (
            <span className="chip">+{venue.amenities.length - 3} more</span>
          )}
        </div>
      </div>

      <div className="venue-card-price">From ₹{Number(venue.basePrice||0).toLocaleString("en-IN")} / {venue.priceUnit || "event"}</div>
      <div className="venue-card-footer">
        <span className="capacity-pill">
          <Users2 size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Up to {venue.capacity}
        </span>
        {venue.status !== "ACTIVE" ? (
          <span className="badge badge-cancelled">{STATUS_LABEL[venue.status] || "Unavailable"}</span>
        ) : venue.upcomingBookings > 0 ? (
          <span className="meta-line">{venue.upcomingBookings} upcoming</span>
        ) : null}
      </div>
    </Link>
  );
}
