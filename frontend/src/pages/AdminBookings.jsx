import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Check, X, Search, AlertTriangle, RotateCcw } from "lucide-react";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import Field from "../components/Field";
import { SkeletonTable } from "../components/Skeleton";
import client, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { value: "PENDING", label: "Waiting" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "", label: "Everything" },
];

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function AdminBookings() {
  const toast = useToast();
  const { user } = useAuth();
  const ownerMode = user?.role === "VENUE_OWNER";
  const [result, setResult] = useState({ bookings: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [venueId, setVenueId] = useState("");
  const [venues, setVenues] = useState([]);
  const [page, setPage] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);

  const [decision, setDecision] = useState(null); // { booking, action }
  const [remarks, setRemarks] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    client
      .get(ownerMode ? "/bookings/manage" : "/bookings", {
        params: {
          status: status || undefined,
          search: search || undefined,
          venueId: venueId || undefined,
          page,
        },
      })
      .then(({ data }) => setResult(data))
      .catch((err) => toast.error(apiError(err, "Could not load requests.").message))
      .finally(() => setLoading(false));
  }, [status, search, venueId, page, toast, ownerMode]);

  useEffect(load, [load]);

  useEffect(() => {
    client
      .get(ownerMode ? "/bookings/manage" : "/bookings", { params: { status: "PENDING", pageSize: 1 } })
      .then(({ data }) => setPendingCount(data.total))
      .catch(() => setPendingCount(0));
  }, [result]);

  useEffect(() => {
    client
      .get(ownerMode ? "/venues/mine" : "/venues")
      .then(({ data }) => setVenues(data.venues))
      .catch(() => setVenues([]));
  }, [ownerMode]);

  const openDecision = (booking, action) => {
    setDecision({ booking, action });
    setRemarks("");
    setDecisionError("");
  };

  const submitDecision = async () => {
    setBusy(true);
    setDecisionError("");
    try {
      const { data } = await client.patch(`/bookings/${decision.booking.id}/status`, {
        status: decision.action,
        adminRemarks: remarks,
      });

      if (decision.action === "APPROVED") {
        const knocked = data.autoRejected?.length || 0;
        toast.success(
          knocked
            ? `Approved. ${knocked} clashing ${knocked === 1 ? "request was" : "requests were"} rejected automatically.`
            : "Booking approved."
        );
      } else {
        toast.success("Request rejected. The requester has been notified.");
      }

      setDecision(null);
      load();
    } catch (err) {
      const { message, conflicts } = apiError(err, "Could not save that decision.");
      setDecisionError(
        conflicts?.length
          ? `${message} Clashing slot: ${conflicts[0].startTime}–${conflicts[0].endTime}.`
          : message
      );
    } finally {
      setBusy(false);
    }
  };

  const changeTab = (value) => {
    setStatus(value);
    setPage(1);
  };

  return (
    <Layout
      title={ownerMode ? "Venue bookings" : "Booking requests"}
      subtitle={ownerMode ? "View booking activity for the venues you own. Approval decisions remain with platform administrators." : "Approve or reject requests. Approving a slot clears any request that clashes with it."}
    >
      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={status === tab.value}
            className={`tab ${status === tab.value ? "active" : ""}`}
            onClick={() => changeTab(tab.value)}
          >
            {tab.label}
            {tab.value === "PENDING" && pendingCount > 0 && (
              <span className="tab-count">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search />
          <input
            placeholder="Search by event, requester, or venue"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search requests"
          />
        </div>
        <select
          className="filter-select"
          value={venueId}
          onChange={(e) => {
            setVenueId(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by venue"
        >
          <option value="">All venues</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : result.bookings.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={status === "PENDING" ? "Nothing waiting on you" : "No requests in this view"}
          description={
            status === "PENDING"
              ? "Every request has been decided. New ones will appear here as they arrive."
              : "Try another tab or clear the search."
          }
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table responsive">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Venue</th>
                  <th>Requested by</th>
                  <th>When</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.bookings.map((b) => (
                  <tr key={b.id}>
                    <td data-label="Event">
                      {b.title}
                      {b.purpose && (
                        <div className="meta-line" title={b.purpose}>
                          {b.purpose.slice(0, 70)}
                          {b.purpose.length > 70 ? "…" : ""}
                        </div>
                      )}
                    </td>
                    <td data-label="Venue">{b.venueName}</td>
                    <td data-label="Requested by">
                      {b.requesterName}
                      <div className="meta-line">
                        {b.requesterRole?.toLowerCase()}
                        {b.requesterOrganization ? ` · ${b.requesterOrganization}` : ""}
                      </div>
                    </td>
                    <td data-label="When">
                      {formatDate(b.date)}
                      <div className="meta-line">
                        {b.startTime}–{b.endTime}
                      </div>
                    </td>
                    <td data-label="Size">
                      {b.expectedAttendees ? `${b.expectedAttendees} / ${b.venueCapacity}` : "—"}
                    </td>
                    <td data-label="Status">
                      <StatusBadge status={b.status} />
                      <div className="meta-line">Payment: {b.paymentStatus?.toLowerCase().replace("_"," ")}</div>
                      {b.decidedByName && b.status !== "PENDING" && (
                        <div className="meta-line">by {b.decidedByName}</div>
                      )}
                    </td>
                    <td data-label="">
                      {!ownerMode && b.paymentStatus === "REFUND_PENDING" && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button className="btn btn-sm btn-primary" onClick={async()=>{try{await client.patch(`/bookings/${b.id}/refund`,{status:"APPROVED",amount:b.refundAmount});toast.success("Refund approved.");load()}catch(e){toast.error(apiError(e,"Could not approve refund.").message)}}}><RotateCcw size={14}/> Approve refund</button>
                          <button className="btn btn-danger btn-sm" onClick={async()=>{try{await client.patch(`/bookings/${b.id}/refund`,{status:"REJECTED",amount:b.refundAmount});toast.success("Refund rejected; booking remains paid.");load()}catch(e){toast.error(apiError(e,"Could not reject refund.").message)}}}>Reject refund</button>
                        </div>
                      )}
                      {!ownerMode && b.status === "PENDING" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn btn-sm"
                            style={{ background: "var(--ivy)", color: "#fff" }}
                            onClick={() => openDecision(b, "APPROVED")}
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => openDecision(b, "REJECTED")}
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            onChange={setPage}
            noun="requests"
          />
        </div>
      )}

      {decision && (
        <div className="modal-overlay" onClick={() => !busy && setDecision(null)} role="presentation">
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3>{decision.action === "APPROVED" ? "Approve this booking" : "Reject this request"}</h3>
            </div>

            {decisionError && <div className="error-banner">{decisionError}</div>}

            <p style={{ fontSize: 14, color: "var(--slate)", marginBottom: 6 }}>
              {decision.booking.title} · {decision.booking.venueName}
            </p>
            <p className="mono" style={{ marginBottom: 16 }}>
              {formatDate(decision.booking.date)} · {decision.booking.startTime}–
              {decision.booking.endTime}
            </p>

            {decision.action === "APPROVED" && (
              <div className="warning-banner">
                <AlertTriangle size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                Any other request overlapping this slot is rejected automatically.
              </div>
            )}

            <Field
              label={decision.action === "REJECTED" ? "Reason for rejection" : "Note for the requester"}
              hint={
                decision.action === "REJECTED"
                  ? "Required — this is what the requester sees."
                  : "Optional — setup instructions, key collection, and so on."
              }
            >
              {(props) => (
                <textarea
                  {...props}
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={
                    decision.action === "REJECTED"
                      ? "The hall is reserved for convocation rehearsals that week."
                      : "Collect the key from the admin desk an hour early."
                  }
                />
              )}
            </Field>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-outline btn-block"
                onClick={() => setDecision(null)}
                disabled={busy}
              >
                Go back
              </button>
              <button
                className="btn btn-block"
                style={{
                  background: decision.action === "APPROVED" ? "var(--ivy)" : "var(--brick)",
                  color: "#fff",
                }}
                disabled={busy}
                onClick={submitDecision}
              >
                {busy
                  ? "Saving…"
                  : decision.action === "APPROVED"
                    ? "Approve booking"
                    : "Reject request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
