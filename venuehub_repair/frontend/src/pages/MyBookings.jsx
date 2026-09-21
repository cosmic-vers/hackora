import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Search, CreditCard, ReceiptText } from "lucide-react";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import ConfirmDialog from "../components/ConfirmDialog";
import { SkeletonTable } from "../components/Skeleton";
import client, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";

const TABS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MyBookings() {
  const toast = useToast();
  const [result, setResult] = useState({ bookings: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    client
      .get("/bookings", {
        params: { mine: true, status: status || undefined, search: search || undefined, page },
      })
      .then(({ data }) => setResult(data))
      .catch((err) => toast.error(apiError(err, "Could not load your bookings.").message))
      .finally(() => setLoading(false));
  }, [status, search, page, toast]);

  useEffect(load, [load]);

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await client.delete(`/bookings/${cancelTarget.id}`);
      toast.success("Booking cancelled.");
      setCancelTarget(null);
      load();
    } catch (err) {
      toast.error(apiError(err, "Could not cancel that booking.").message);
    } finally {
      setCancelling(false);
    }
  };

  const changeTab = (value) => {
    setStatus(value);
    setPage(1);
  };

  return (
    <Layout title="My bookings" subtitle="Every request you've sent, and where it stands.">
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
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search />
          <input
            placeholder="Search your bookings"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search your bookings"
          />
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={4} cols={5} />
      ) : result.bookings.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={status ? `No ${status.toLowerCase()} bookings` : "No bookings yet"}
          description={
            status
              ? "Try another tab to see the rest of your requests."
              : "Pick a venue, choose a slot, and send your first request."
          }
          actionLabel={status ? undefined : "Browse venues"}
          actionTo={status ? undefined : "/app/venues"}
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table responsive">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Venue</th>
                  <th>When</th>
                  <th>Status</th>
                  <th>Admin notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.bookings.map((b) => (
                  <tr key={b.id}>
                    <td data-label="Event">
                      {b.title}
                      <div className="meta-line">{b.category.toLowerCase()}</div>
                    </td>
                    <td data-label="Venue">{b.venueName}</td>
                    <td data-label="When">
                      {formatDate(b.date)}
                      <div className="meta-line">
                        {b.startTime}–{b.endTime}
                      </div>
                    </td>
                    <td data-label="Status">
                      <StatusBadge status={b.status} />
                      <div className="meta-line">Payment: {b.paymentStatus?.toLowerCase().replace("_"," ")}</div>
                    </td>
                    <td data-label="Admin notes" style={{ color: "var(--slate)", fontSize: 13 }}>
                      {b.adminRemarks || "—"}
                    </td>
                    <td data-label="">
                      <div className="table-actions">
                      {b.status === "APPROVED" && b.paymentStatus === "UNPAID" && <button className="btn btn-primary btn-sm" onClick={()=>window.location.href=`/app/payment/${b.id}`}><CreditCard/> Pay</button>}
                      {b.paymentStatus === "PAID" && <button className="btn btn-ghost btn-sm" onClick={()=>window.location.href=`/app/receipt/${b.id}`}><ReceiptText/> Receipt</button>}
                      {(b.status === "PENDING" || b.status === "APPROVED") && (
                        <button className="btn btn-danger btn-sm" onClick={() => setCancelTarget(b)}>Cancel</button>
                      )}
                      </div>
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
            noun="bookings"
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel this booking?"
        body={
          cancelTarget
            ? `${cancelTarget.title} at ${cancelTarget.venueName} on ${formatDate(cancelTarget.date)}. The slot goes back into the pool straight away.`
            : ""
        }
        confirmLabel="Cancel booking"
        cancelLabel="Keep it"
        busy={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </Layout>
  );
}
