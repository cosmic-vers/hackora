import { useEffect, useMemo, useState } from "react";
import { Search, Building2, SlidersHorizontal } from "lucide-react";
import Layout from "../components/Layout";
import VenueCard from "../components/VenueCard";
import EmptyState from "../components/EmptyState";
import { SkeletonCards } from "../components/Skeleton";
import client, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";

const CAPACITY_STEPS = [
  { value: "", label: "Any size" },
  { value: "50", label: "50+ people" },
  { value: "150", label: "150+ people" },
  { value: "300", label: "300+ people" },
  { value: "600", label: "600+ people" },
];

/** Waits for typing to settle so every keystroke is not a request. */
function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function Venues() {
  const toast = useToast();
  const [venues, setVenues] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [minCapacity, setMinCapacity] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  const debouncedSearch = useDebounced(search);

  useEffect(() => {
    setLoading(true);
    client
      .get("/venues", {
        params: {
          search: debouncedSearch || undefined,
          type: type || undefined,
          minCapacity: minCapacity || undefined,
          status: availableOnly ? "ACTIVE" : undefined,
        },
      })
      .then(({ data }) => {
        setVenues(data.venues);
        if (data.types) setTypes(data.types);
      })
      .catch((err) => toast.error(apiError(err, "Could not load venues.").message))
      .finally(() => setLoading(false));
  }, [debouncedSearch, type, minCapacity, availableOnly, toast]);

  const filtersApplied = useMemo(
    () => Boolean(debouncedSearch || type || minCapacity || availableOnly),
    [debouncedSearch, type, minCapacity, availableOnly]
  );

  const clearFilters = () => {
    setSearch("");
    setType("");
    setMinCapacity("");
    setAvailableOnly(false);
  };

  return (
    <Layout
      title="Browse venues"
      subtitle="Find a space that fits your event, class, or meeting."
    >
      <div className="toolbar">
        <div className="search-box">
          <Search />
          <input
            placeholder="Search by name, location, or type"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search venues"
          />
        </div>

        <select
          className="filter-select"
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Filter by venue type"
        >
          <option value="">All venue types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={minCapacity}
          onChange={(e) => setMinCapacity(e.target.value)}
          aria-label="Filter by capacity"
        >
          {CAPACITY_STEPS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <span
          className={`checkbox-chip ${availableOnly ? "checked" : ""}`}
          onClick={() => setAvailableOnly((v) => !v)}
          role="checkbox"
          aria-checked={availableOnly}
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setAvailableOnly((v) => !v)}
        >
          <SlidersHorizontal size={13} /> Open for booking
        </span>

        {filtersApplied && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonCards />
      ) : venues.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No venues match those filters"
          description="Try a broader search, or clear the filters to see everything on venue operations."
          actionLabel={filtersApplied ? "Clear filters" : undefined}
          onAction={clearFilters}
        />
      ) : (
        <>
          <p className="meta-line" style={{ marginBottom: 14 }}>
            {venues.length} {venues.length === 1 ? "venue" : "venues"}
          </p>
          <div className="venue-grid">
            {venues.map((v) => (
              <VenueCard venue={v} key={v.id} />
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}
