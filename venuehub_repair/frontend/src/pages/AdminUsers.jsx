import { useCallback, useEffect, useState } from "react";
import { Users, Trash2, Search } from "lucide-react";
import Layout from "../components/Layout";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import ConfirmDialog from "../components/ConfirmDialog";
import { SkeletonTable } from "../components/Skeleton";
import client, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";

const ROLES = [
  { value: "", label: "Everyone" },
  { value: "ADMIN", label: "Admins" },
  { value: "VENUE_OWNER", label: "Venue owners" },
  { value: "CUSTOMER", label: "Customers" },
];

export default function AdminUsers() {
  const toast = useToast();
  const [result, setResult] = useState({ users: [], total: 0, page: 1, pageSize: 50 });
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    client
      .get("/users", { params: { role: role || undefined, search: search || undefined, page } })
      .then(({ data }) => setResult(data))
      .catch((err) => toast.error(apiError(err, "Could not load people.").message))
      .finally(() => setLoading(false));
  }, [role, search, page, toast]);

  useEffect(load, [load]);

  const changeRole = async (person, nextRole) => {
    if (!nextRole || nextRole === person.role) return;
    setUpdatingRole(person.id);
    try {
      const { data } = await client.patch(`/users/${person.id}/role`, { role: nextRole });
      toast.success(data.message || "Role updated.");
      load();
    } catch (err) {
      toast.error(apiError(err, "Could not update that role.").message);
    } finally {
      setUpdatingRole(null);
    }
  };

  const confirmRemove = async () => {
    setRemoving(true);
    try {
      const { data } = await client.delete(`/users/${removeTarget.id}`);
      toast.success(data.message || "Account removed.");
      setRemoveTarget(null);
      load();
    } catch (err) {
      toast.error(apiError(err, "Could not remove that account.").message);
      setRemoveTarget(null);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Layout title="People" subtitle="Everyone with a VenueHub account.">
      <div className="toolbar">
        <div className="search-box">
          <Search />
          <input
            placeholder="Search by name, email, or organization"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search people"
          />
        </div>
        <select
          className="filter-select"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by role"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : result.users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nobody matches that filter"
          description="Try a different role, or clear the search box."
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table responsive">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Organization / team</th>
                  <th>Bookings</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.users.map((u) => (
                  <tr key={u.id}>
                    <td data-label="Name">{u.name}</td>
                    <td data-label="Email">{u.email}</td>
                    <td data-label="Role">
                      <select
                        className="filter-select"
                        value={u.role}
                        disabled={updatingRole === u.id || u.role === "SUPER_ADMIN"}
                        onChange={(e) => changeRole(u, e.target.value)}
                        aria-label={`Change role for ${u.name}`}
                      >
                        <option value="CUSTOMER">Customer</option>
                        <option value="VENUE_OWNER">Venue owner</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td data-label="Organization">{u.organization || "—"}</td>
                    <td data-label="Bookings">{u.bookingCount}</td>
                    <td data-label="Joined">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td data-label="">
                      {u.role !== "ADMIN" && u.role !== "SUPER_ADMIN" && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setRemoveTarget(u)}
                          aria-label={`Remove ${u.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
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
            noun="people"
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={removeTarget ? `Remove ${removeTarget.name}?` : ""}
        body={
          removeTarget
            ? `This deletes the account and its ${removeTarget.bookingCount} booking${removeTarget.bookingCount === 1 ? "" : "s"}, including any approved slots.`
            : ""
        }
        confirmLabel="Remove account"
        cancelLabel="Keep it"
        busy={removing}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </Layout>
  );
}
