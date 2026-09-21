import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Building2, Search } from "lucide-react";
import Layout from "../components/Layout";
import Field from "../components/Field";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import { SkeletonTable } from "../components/Skeleton";
import client, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";

const VENUE_TYPES = [
  "Auditorium",
  "Seminar Hall",
  "Function Hall",
  "Classroom",
  "Outdoor Venue",
  "Meeting Room",
];

const AMENITY_OPTIONS = [
  "Stage",
  "Projector",
  "Sound System",
  "Air Conditioning",
  "Whiteboard",
  "Video Conferencing",
  "Green Room",
  "Lighting Rig",
  "Catering Access",
  "Decoration Points",
];

const STATUS_LABEL = {
  ACTIVE: "Open for booking",
  MAINTENANCE: "Under maintenance",
  INACTIVE: "Not bookable",
};

const blankVenue = {
  name: "",
  type: VENUE_TYPES[0],
  location: "",
  capacity: "",
  amenities: [],
  description: "",
  status: "ACTIVE",
  openTime: "08:00",
  closeTime: "21:00",
  basePrice: "",
  priceUnit: "event",
  photos: [],
};

export default function AdminVenues() {
  const toast = useToast();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankVenue);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    client
      .get("/venues", { params: { search: search || undefined } })
      .then(({ data }) => setVenues(data.venues))
      .catch((err) => toast.error(apiError(err, "Could not load venues.").message))
      .finally(() => setLoading(false));
  }, [search, toast]);

  useEffect(load, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(blankVenue);
    setErrors({});
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (venue) => {
    setEditing(venue);
    setForm({ ...venue, capacity: String(venue.capacity) });
    setErrors({});
    setFormError("");
    setModalOpen(true);
  };

  const toggleAmenity = (amenity) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(amenity)
        ? f.amenities.filter((a) => a !== amenity)
        : [...f.amenities, amenity],
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError("");

    const payload = {
      name: form.name,
      type: form.type,
      location: form.location,
      capacity: Number(form.capacity),
      amenities: form.amenities,
      description: form.description,
      status: form.status,
      openTime: form.openTime,
      closeTime: form.closeTime,
      basePrice: Number(form.basePrice || 0),
      priceUnit: form.priceUnit || "event",
      photos: (Array.isArray(form.photos) ? form.photos : []).filter(Boolean).slice(0, 10),
    };

    try {
      if (editing) {
        await client.put(`/venues/${editing.id}`, payload);
        toast.success(`${payload.name} updated.`);
      } else {
        await client.post("/venues", payload);
        toast.success(`${payload.name} added.`);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      const { message, fields } = apiError(err, "Could not save this venue.");
      setErrors(fields);
      setFormError(message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await client.delete(`/venues/${deleteTarget.id}`);
      toast.success(`${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(apiError(err, "Could not delete this venue.").message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const setStatus = async (venue, status) => {
    try {
      await client.put(`/venues/${venue.id}`, { status });
      toast.success(`${venue.name} is now ${STATUS_LABEL[status].toLowerCase()}.`);
      load();
    } catch (err) {
      toast.error(apiError(err, "Could not update the venue.").message);
    }
  };

  return (
    <Layout
      title="Venues"
      subtitle="Add rooms, set opening hours, and take a space off the list when it's unavailable."
      actions={
        <button className="btn btn-accent" onClick={openCreate}>
          <Plus size={16} /> Add venue
        </button>
      }
    >
      <div className="toolbar">
        <div className="search-box">
          <Search />
          <input
            placeholder="Search venues"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search venues"
          />
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : venues.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={search ? "No venues match that search" : "No venues yet"}
          description={
            search
              ? "Try a different name or location."
              : "Add the halls, classrooms, and outdoor spaces people can book."
          }
          actionLabel={search ? undefined : "Add the first venue"}
          onAction={search ? undefined : openCreate}
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table responsive">
              <thead>
                <tr>
                  <th>Venue</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Holds</th>
                  <th>Hours</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {venues.map((v) => (
                  <tr key={v.id}>
                    <td data-label="Venue">
                      {v.name}
                      {v.upcomingBookings > 0 && (
                        <div className="meta-line">{v.upcomingBookings} upcoming bookings</div>
                      )}
                    </td>
                    <td data-label="Type">{v.type}</td>
                    <td data-label="Location">{v.location}</td>
                    <td data-label="Holds">{v.capacity}</td>
                    <td data-label="Hours" className="mono">
                      {v.openTime}–{v.closeTime}
                    </td>
                    <td data-label="Status">
                      <span
                        className={`badge ${v.status === "ACTIVE" ? "badge-approved" : "badge-cancelled"}`}
                      >
                        {STATUS_LABEL[v.status]}
                      </span>
                    </td>
                    <td data-label="">
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openEdit(v)}
                          aria-label={`Edit ${v.name}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setStatus(v, v.status === "ACTIVE" ? "MAINTENANCE" : "ACTIVE")}
                        >
                          {v.status === "ACTIVE" ? "Close" : "Reopen"}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteTarget(v)}
                          aria-label={`Delete ${v.name}`}
                        >
                          <Trash2 size={13} />
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

      {modalOpen && (
        <div className="modal-overlay" onClick={() => !busy && setModalOpen(false)} role="presentation">
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3>{editing ? `Edit ${editing.name}` : "Add a venue"}</h3>
            </div>

            {formError && <div className="error-banner">{formError}</div>}

            <form onSubmit={save} noValidate>
              <Field label="Venue name" error={errors.name}>
                {(props) => (
                  <input
                    {...props}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                )}
              </Field>

              <div className="field-row">
                <Field label="Type" error={errors.type}>
                  {(props) => (
                    <select
                      {...props}
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    >
                      {VENUE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>

                <Field label="Capacity" error={errors.capacity}>
                  {(props) => (
                    <input
                      {...props}
                      type="number"
                      min="1"
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                      required
                    />
                  )}
                </Field>
              </div>

              <Field label="Location" error={errors.location}>
                {(props) => (
                  <input
                    {...props}
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Main Block, Ground Floor"
                    required
                  />
                )}
              </Field>

              <div className="field-row">
                <Field label="Opens at" error={errors.openTime}>
                  {(props) => (
                    <input
                      {...props}
                      type="time"
                      value={form.openTime}
                      onChange={(e) => setForm({ ...form, openTime: e.target.value })}
                      required
                    />
                  )}
                </Field>

                <Field
                  label="Closes at"
                  error={errors.closeTime}
                  hint="Requests outside these hours are refused."
                >
                  {(props) => (
                    <input
                      {...props}
                      type="time"
                      value={form.closeTime}
                      onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
                      required
                    />
                  )}
                </Field>
              </div>

              <div className="field-row">
                <Field label="Base price" error={errors.basePrice}>
                  {(props) => (
                    <input
                      {...props}
                      type="number"
                      min="0"
                      value={form.basePrice || ""}
                      onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                      placeholder="7500"
                    />
                  )}
                </Field>

                <Field label="Price unit">
                  {(props) => (
                    <select
                      {...props}
                      value={form.priceUnit || "event"}
                      onChange={(e) => setForm({ ...form, priceUnit: e.target.value })}
                    >
                      <option value="event">event</option>
                      <option value="hour">hour</option>
                      <option value="day">day</option>
                    </select>
                  )}
                </Field>
              </div>

              <Field label="Photo URLs" hint="One public image URL per line; up to 10 images.">
                {(props) => (
                  <textarea
                    {...props}
                    rows={3}
                    value={(form.photos || []).join("\n")}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        photos: e.target.value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean).slice(0, 10),
                      })
                    }
                    placeholder="https://example.com/hall-1.jpg\nhttps://example.com/hall-2.jpg"
                  />
                )}
              </Field>

              <Field label="Description" error={errors.description}>
                {(props) => (
                  <textarea
                    {...props}
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What this space is usually used for."
                  />
                )}
              </Field>

              <div className="field">
                <label>Amenities</label>
                <div className="tag-row">
                  {AMENITY_OPTIONS.map((a) => (
                    <span
                      key={a}
                      className={`checkbox-chip ${form.amenities.includes(a) ? "checked" : ""}`}
                      onClick={() => toggleAmenity(a)}
                      role="checkbox"
                      aria-checked={form.amenities.includes(a)}
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleAmenity(a)}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              {editing && (
                <Field label="Status" error={errors.status}>
                  {(props) => (
                    <select
                      {...props}
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-block"
                  onClick={() => setModalOpen(false)}
                  disabled={busy}
                >
                  Go back
                </button>
                <button type="submit" className="btn btn-accent btn-block" disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save changes" : "Add venue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget ? `Delete ${deleteTarget.name}?` : ""}
        body="This removes the venue for everyone. If it is only temporarily unavailable, close it instead."
        confirmLabel="Delete venue"
        cancelLabel="Keep it"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  );
}
