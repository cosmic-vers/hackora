import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  MapPin,
  Users,
  CalendarDays,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wrench,
} from "lucide-react";
import Layout from "../components/Layout";
import Field from "../components/Field";
import client, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";

const CATEGORIES = [
  "ACADEMIC", "CULTURAL", "TECHNICAL", "SPORTS",
  "MEETING", "WORKSHOP", "PLACEMENT",
  "WEDDING", "BIRTHDAY", "CONFERENCE", "RECEPTION", "OTHER",
];

const SERVICE_OPTIONS = [
  ["TECHNICAL", "AV / Sound system"],
  ["CLEANING", "Cleaning"],
  ["SECURITY", "Security"],
  ["DECORATION", "Decoration / Design"],
  ["CATERING", "Catering"],
  ["PHOTOGRAPHY", "Photography / Media"],
  ["SEATING", "Seating arrangement"],
  ["ELECTRICAL", "Electrical"],
  ["MAINTENANCE", "Maintenance"],
];

const AMENITY_OPTIONS = [
  "Projector", "Sound System", "Stage", "Air Conditioning",
  "Video Conferencing", "Whiteboard", "Lighting Rig", "Catering Access",
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function ResultCard({ item, rank, date }) {
  const navigate = useNavigate();
  const available = item.availableForRequestedSlot;
  return (
    <div className={`ai-result-card ${rank === 1 ? "top" : ""}`}>
      <div className="ai-result-rank">#{rank}</div>
      <div className="ai-result-main">
        <div className="row-between">
          <div>
            <h3>{item.name}</h3>
            <div className="meta-line">
              <MapPin size={13} /> {item.location} · {item.type}
            </div>
          </div>
          <div className="ai-score">
            <strong>{item.score}</strong>
            <span>/100 fit</span>
          </div>
        </div>

        <div className="ai-status-row">
          <span className={available ? "ai-good" : "ai-warning"}>
            {available ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {available ? "Available for requested slot" : "Slot needs attention"}
          </span>
          <span><Users size={14} /> Up to {item.capacity}</span>
        </div>

        <p className="ai-reason">{item.aiReason || item.reasons?.slice(0, 3).join(" · ")}</p>

        {item.pros?.length > 0 && (
          <div className="ai-tags">
            {item.pros.map((p) => <span className="chip" key={p}>{p}</span>)}
          </div>
        )}

        {(item.missingAmenities?.length > 0 || item.missingServices?.length > 0) && (
          <div className="ai-tradeoff">
            <AlertTriangle size={14} />
            <span>
              Missing: {[...(item.missingAmenities || []), ...(item.missingServices || [])].join(", ")}
            </span>
          </div>
        )}

        <div className="ai-result-actions">
          <button
            className="btn btn-accent btn-sm"
            onClick={() => navigate(`/app/book?venueId=${encodeURIComponent(item.id)}&date=${encodeURIComponent(date)}`)}
          >
            Use this venue <ArrowRight size={14} />
          </button>
          <span className="meta-line">
            {item.supportServices?.length || 0} on-site support services
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AIRecommendation() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [amenities, setAmenities] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    title: "",
    purpose: "",
    category: "ACADEMIC",
    expectedAttendees: "100",
    date: todayStr(),
    startTime: "10:00",
    endTime: "12:00",
    location: "",
  });

  const toggle = (setter) => (value) => {
    setter((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  };

  const update = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const { data } = await client.post("/recommendations", {
        ...form,
        expectedAttendees: Number(form.expectedAttendees || 0),
        amenities,
        requiredServices: services,
      });
      setResult(data);
    } catch (err) {
      toast.error(apiError(err, "Could not generate recommendations.").message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      title="AI Venue Advisor"
      subtitle="Describe your event and VenueHub will match it against capacity, facilities, availability, pricing and support services."
    >
      <div className="ai-hero card card-pad">
        <div className="ai-hero-icon"><Sparkles /></div>
        <div>
          <div className="eyebrow">INTELLIGENT VENUE MATCHING</div>
          <h2>Tell us what you're planning.</h2>
          <p>
            VenueHub evaluates event requirements against live venue, booking and service data.
            When AI is configured, it also interprets the event context and explains the ranking.
          </p>
        </div>
      </div>

      <div className="split-2 ai-layout" style={{ alignItems: "start" }}>
        <form className="card card-pad" onSubmit={submit}>
          <div className="section-title">Event requirements</div>

          <Field label="Event title">
            {(props) => <input {...props} value={form.title} onChange={update("title")} placeholder="AI & Robotics Workshop" />}
          </Field>

          <Field label="What are you organizing?">
            {(props) => <textarea {...props} rows={3} value={form.purpose} onChange={update("purpose")} placeholder="Technical workshop with demonstrations and a guest speaker." />}
          </Field>

          <div className="field-row">
            <Field label="Event type">
              {(props) => (
                <select {...props} value={form.category} onChange={update("category")}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c[0] + c.slice(1).toLowerCase()}</option>)}
                </select>
              )}
            </Field>
            <Field label="Expected attendees">
              {(props) => <input {...props} type="number" min="1" value={form.expectedAttendees} onChange={update("expectedAttendees")} />}
            </Field>
          </div>

          <div className="field-row">
            <Field label="Date">
              {(props) => <input {...props} type="date" min={todayStr()} value={form.date} onChange={update("date")} required />}
            </Field>
            <Field label="Preferred area / location">
              {(props) => <input {...props} value={form.location} onChange={update("location")} placeholder="Tech Block (optional)" />}
            </Field>
          </div>

          <div className="field-row">
            <Field label="Start time">
              {(props) => <input {...props} type="time" value={form.startTime} onChange={update("startTime")} required />}
            </Field>
            <Field label="End time">
              {(props) => <input {...props} type="time" value={form.endTime} onChange={update("endTime")} required />}
            </Field>
          </div>

          <div className="ai-choice-group">
            <div className="ai-choice-title"><Wrench size={15} /> Required facilities</div>
            <div className="ai-choice-grid">
              {AMENITY_OPTIONS.map((item) => (
                <label className={`ai-check ${amenities.includes(item) ? "selected" : ""}`} key={item}>
                  <input type="checkbox" checked={amenities.includes(item)} onChange={() => toggle(setAmenities)(item)} />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <div className="ai-choice-group">
            <div className="ai-choice-title"><Users size={15} /> Required support</div>
            <div className="ai-choice-grid">
              {SERVICE_OPTIONS.map(([value, label]) => (
                <label className={`ai-check ${services.includes(value) ? "selected" : ""}`} key={value}>
                  <input type="checkbox" checked={services.includes(value)} onChange={() => toggle(setServices)(value)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <button className="btn btn-accent btn-block" disabled={loading} type="submit">
            <Sparkles size={16} />
            {loading ? "Analyzing venues…" : "Find my best-fit venues"}
          </button>
        </form>

        <div>
          {!result && !loading && (
            <div className="card card-pad ai-empty">
              <Sparkles size={30} />
              <h3>Recommendations will appear here</h3>
              <p>
                VenueHub will compare capacity, facilities, exact time-slot availability,
                event context and on-site support services.
              </p>
            </div>
          )}

          {loading && (
            <div className="card card-pad ai-empty">
              <div className="spinner" />
              <h3>Analyzing available venues…</h3>
              <p>Checking live availability and matching your event requirements.</p>
            </div>
          )}

          {result && (
            <>
              <div className="ai-result-head">
                <div>
                  <div className="eyebrow">RECOMMENDATION ENGINE</div>
                  <h2>{result.mode === "ai" ? "AI-ranked venues" : "Smart-ranked venues"}</h2>
                </div>
                <span className={`ai-mode-badge ${result.mode}`}>
                  {result.mode === "ai" ? "AI ACTIVE" : "LOCAL FALLBACK"}
                </span>
              </div>
              <p className="ai-explanation">{result.explanation}</p>
              <div className="ai-results">
                {result.recommendations.map((item, index) => (
                  <ResultCard key={item.id} item={item} rank={index + 1} date={form.date} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
