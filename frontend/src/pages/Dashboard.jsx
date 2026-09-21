import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  ArrowRight,
  CalendarPlus,
} from "lucide-react";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import { SkeletonStats, SkeletonTable } from "../components/Skeleton";
import client, { apiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

function StatCard({ label, value, icon: Icon, tone, suffix }) {
  const tones = {
    brass: { background: "var(--brass-soft)", color: "var(--brass-ink)" },
    ivy: { background: "var(--ivy-soft)", color: "var(--ivy-dim)" },
    brick: { background: "var(--brick-soft)", color: "var(--brick-dim)" },
    neutral: { background: "var(--paper-dim)", color: "var(--ink)" },
  };
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        <div className="stat-card-icon" style={tones[tone] || tones.neutral}>
          <Icon />
        </div>
      </div>
      <div className="stat-value">
        {value}
        {suffix && (
          <span style={{ fontSize: 14, color: "var(--slate)", fontFamily: "var(--font-body)" }}>
            {" "}
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "ADMIN";
  const EMPTY_DATA = {
    stats: { pending: 0, approved: 0, rejected: 0, cancelled: 0 },
    recent: [],
    upcoming: [],
    venues: { active: 0, total: 0 },
  };
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    client
      .get("/analytics/summary")
      .then(({ data: payload }) => {
        setData({ ...EMPTY_DATA, ...payload, stats: { ...EMPTY_DATA.stats, ...(payload?.stats || {}) }, venues: { ...EMPTY_DATA.venues, ...(payload?.venues || {}) }, recent: payload?.recent || [], upcoming: payload?.upcoming || [] });
        setLoadError("");
      })
      .catch((err) => {
        const message = apiError(err, "Could not load your dashboard.").message;
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const stats = data?.stats;

  return (
    <Layout
      title={`Welcome, ${user?.name?.split(" ")[0] || "there"}`}
      subtitle={
        isAdmin
          ? "What's happening across every campus venue today."
          : "Where your requests stand right now."
      }
      actions={
        !isAdmin && (
          <Link to="/app/book" className="btn btn-accent">
            <CalendarPlus size={16} /> New booking
          </Link>
        )
      }
    >
      {loading ? (
        <>
          <SkeletonStats />
          <SkeletonTable />
        </>
      ) : (
        <>
          {loadError && (
            <div className="error-banner" style={{ marginBottom: 18 }}>
              <strong>Dashboard data is temporarily unavailable.</strong> {loadError}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginLeft: 10 }}
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          )}
          <div className="grid-stats">
            <StatCard
              label={isAdmin ? "Waiting on you" : "Awaiting approval"}
              value={stats.pending}
              icon={Clock}
              tone="brass"
            />
            <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} tone="ivy" />
            <StatCard
              label="Rejected or cancelled"
              value={stats.rejected + stats.cancelled}
              icon={XCircle}
              tone="brick"
            />
            <StatCard
              label="Venues open for booking"
              value={data.venues.active}
              suffix={`of ${data.venues.total}`}
              icon={Building2}
              tone="neutral"
            />
          </div>

          <div className="split-2">
            <div className="card card-pad">
              <div className="row-between" style={{ marginBottom: 14 }}>
                <span className="section-title" style={{ marginBottom: 0 }}>
                  {isAdmin ? "Latest requests" : "Your recent requests"}
                </span>
                <Link
                  to={isAdmin ? "/app/admin/bookings" : "/app/my-bookings"}
                  className="btn btn-ghost btn-sm"
                >
                  View all <ArrowRight size={14} />
                </Link>
              </div>

              {data.recent.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title={isAdmin ? "No requests yet" : "You haven't booked anything yet"}
                  description={
                    isAdmin
                      ? "As soon as someone requests a venue, it lands here for review."
                      : "Find a space that fits your event and send your first request."
                  }
                  actionLabel={isAdmin ? undefined : "Browse venues"}
                  actionTo={isAdmin ? undefined : "/app/venues"}
                />
              ) : (
                <div className="table-wrap">
                  <table className="data-table responsive">
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Venue</th>
                        <th>When</th>
                        {isAdmin && <th>Requested by</th>}
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((b) => (
                        <tr key={b.id}>
                          <td data-label="Event">{b.title}</td>
                          <td data-label="Venue">{b.venueName}</td>
                          <td data-label="When">
                            {formatDate(b.date)}
                            <span className="meta-line">
                              {" "}
                              {b.startTime}–{b.endTime}
                            </span>
                          </td>
                          {isAdmin && <td data-label="Requested by">{b.requesterName}</td>}
                          <td data-label="Status">
                            <StatusBadge status={b.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card card-pad">
              <span className="section-title">Coming up</span>
              {data.upcoming.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title="Nothing scheduled"
                  description="Approved bookings with a future date appear here."
                />
              ) : (
                data.upcoming.map((b) => (
                  <div className="slot-row" key={b.id}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{b.title}</div>
                      <div className="meta-line">
                        {b.venueName} · {formatDate(b.date)}
                      </div>
                    </div>
                    <span className="mono">{b.startTime}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
