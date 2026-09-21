import { useCallback, useEffect, useState } from "react";
import { Ban, Trash2, RefreshCw } from "lucide-react";
import Layout from "../components/Layout";
import Field from "../components/Field";
import client, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";

function today() { return new Date().toISOString().slice(0, 10); }

export default function AdminBlocks() {
  const toast = useToast();
  const [venues, setVenues] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ venueId: "", date: today(), startTime: "09:00", endTime: "17:00", reason: "Maintenance" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: venueData }, { data: blockData }] = await Promise.all([client.get("/venues"), client.get("/blocks")]);
      setVenues(venueData.venues || []);
      setBlocks(blockData.blocks || []);
      if (!form.venueId && venueData.venues?.[0]) setForm((current) => ({ ...current, venueId: venueData.venues[0].id }));
    } catch (err) {
      toast.error(apiError(err, "Could not load maintenance blocks.").message);
      setVenues([]);
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, [toast, form.venueId]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.venueId) return toast.error("Choose a venue first.");
    if (form.startTime >= form.endTime) return toast.error("End time must be after start time.");
    setSaving(true);
    try {
      await client.post("/blocks", form);
      toast.success("Blocked period added.");
      setForm((current) => ({ ...current, startTime: "09:00", endTime: "17:00", reason: "Maintenance" }));
      load();
    } catch (err) {
      toast.error(apiError(err, "Could not block this period.").message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await client.delete(`/blocks/${id}`);
      toast.success("Blocked period removed.");
      load();
    } catch (err) {
      toast.error(apiError(err, "Could not remove this block.").message);
    }
  };

  return (
    <Layout title="Maintenance & blocked dates" subtitle="Reserve time for repairs, setup, inspections and other operational holds.">
      <div className="split-2" style={{ alignItems: "start" }}>
        <form className="card card-pad" onSubmit={submit}>
          <div className="section-title">Create a blocked period</div>
          <Field label="Venue">{(p) => <select {...p} value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })} required><option value="">Choose venue</option>{venues.map((v) => <option value={v.id} key={v.id}>{v.name}</option>)}</select>}</Field>
          <Field label="Date">{(p) => <input {...p} type="date" min={today()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />}</Field>
          <div className="field-row">
            <Field label="Start">{(p) => <input {...p} type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />}</Field>
            <Field label="End">{(p) => <input {...p} type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />}</Field>
          </div>
          <Field label="Reason">{(p) => <input {...p} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={160} />}</Field>
          <button className="btn btn-primary" type="submit" disabled={saving || !venues.length}><Ban /> {saving ? "Blocking…" : "Block venue"}</button>
        </form>

        <div className="card">
          <div className="card-pad"><div className="row-between"><div className="section-title" style={{ marginBottom: 0 }}>Scheduled holds</div><button type="button" className="btn btn-ghost btn-sm" onClick={load} disabled={loading}><RefreshCw size={14} /> Refresh</button></div></div>
          {loading ? <div className="card-pad meta-line">Loading maintenance schedule…</div> : (
            <div className="table-wrap">
              <table className="data-table responsive"><thead><tr><th>Venue</th><th>When</th><th>Reason</th><th /></tr></thead>
                <tbody>{blocks.map((b) => <tr key={b.id}><td data-label="Venue">{b.venueName}</td><td data-label="When">{b.date}<div className="meta-line">{b.startTime}–{b.endTime}</div></td><td data-label="Reason">{b.reason}</td><td data-label=""><button className="icon-btn" onClick={() => remove(b.id)} title="Remove block"><Trash2 /></button></td></tr>)}{!blocks.length && <tr><td colSpan="4"><div className="card-pad meta-line">No blocked periods yet.</div></td></tr>}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
