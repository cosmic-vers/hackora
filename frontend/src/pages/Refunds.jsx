import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Check, X } from "lucide-react";
import Layout from "../components/Layout";
import EmptyState from "../components/EmptyState";
import { SkeletonTable } from "../components/Skeleton";
import client, { apiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatWhen(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RefundStatusBadge({ status }) {
  const config = {
    PENDING: { cls: "badge-pending", label: "Awaiting review" },
    PROCESSED: { cls: "badge-approved", label: "Refunded" },
    APPROVED: { cls: "badge-approved", label: "Refunded" },
    REJECTED: { cls: "badge-rejected", label: "Rejected" },
  }[status] || { cls: "badge-cancelled", label: status?.toLowerCase() || "—" };
  return <span className={`badge ${config.cls}`}>{config.label}</span>;
}

export default function Refunds() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.role);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    client
      .get("/bookings/refunds")
      .then(({ data }) => setBookings(data.bookings || []))
      .catch((err) => toast.error(apiError(err, "Could not load refunds.").message))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(load, [load]);

  const decide = async (booking, status) => {
    setBusyId(booking.id);
    try {
      await client.patch(`/bookings/${booking.id}/refund`, { status, amount: booking.refundAmount });
      toast.success(status === "APPROVED" ? "Refund approved." : "Refund rejected; booking remains paid.");
      load();
    } catch (err) {
      toast.error(apiError(err, "Could not update that refund.").message);
    } finally {
      setBusyId(null);
    }
  };

  const pending = bookings.filter((b) => b.refund?.status === "PENDING");

  return (
    <Layout
      title="Refunds"
      subtitle={
        isAdmin
          ? "Review refund requests created by cancelled, paid bookings."
          : "Track refunds from bookings you cancelled after paying."
      }
    >
      {loading ? (
        <SkeletonTable rows={4} cols={5} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="No refunds yet"
          description={
            isAdmin
              ? "Refund requests appear here as soon as a paid booking is cancelled."
              : "If you cancel a paid booking, its refund status will show up here."
          }
        />
      ) : (
        <>
          {isAdmin && pending.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="table-wrap">
                <table className="data-table responsive">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Requested by</th>
                      <th>Amount</th>
                      <th>Requested</th>
                      <th>Reason</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((b) => (
                      <tr key={b.id}>
                        <td data-label="Event">
                          {b.title}
                          <div className="meta-line">
                            {b.venueName} · {formatDate(b.date)}
                          </div>
                        </td>
                        <td data-label="Requested by">{b.requesterName}</td>
                        <td data-label="Amount">₹{Number(b.refundAmount || 0).toLocaleString("en-IN")}</td>
                        <td data-label="Requested">{formatWhen(b.refund?.requestedAt)}</td>
                        <td data-label="Reason" style={{ color: "var(--slate)", fontSize: 13 }}>
                          {b.refund?.reason || "—"}
                        </td>
                        <td data-label="">
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button
                              className="btn btn-sm btn-primary"
                              disabled={busyId === b.id}
                              onClick={() => decide(b, "APPROVED")}
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={busyId === b.id}
                              onClick={() => decide(b, "REJECTED")}
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card">
            <div className="row-between" style={{ padding: "14px 16px 0" }}>
              <span className="section-title" style={{ marginBottom: 0 }}>
                {isAdmin ? "All refund history" : "Your refunds"}
              </span>
            </div>
            <div className="table-wrap">
              <table className="data-table responsive">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Venue</th>
                    {isAdmin && <th>Requested by</th>}
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Last updated</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td data-label="Event">
                        {b.title}
                        <div className="meta-line">{formatDate(b.date)}</div>
                      </td>
                      <td data-label="Venue">{b.venueName}</td>
                      {isAdmin && <td data-label="Requested by">{b.requesterName}</td>}
                      <td data-label="Amount">₹{Number(b.refundAmount || 0).toLocaleString("en-IN")}</td>
                      <td data-label="Status">
                        <RefundStatusBadge status={b.refund?.status} />
                      </td>
                      <td data-label="Last updated" className="meta-line">
                        {formatWhen(b.refund?.updatedAt || b.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
