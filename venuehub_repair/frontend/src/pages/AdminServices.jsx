import { useEffect, useState } from "react";
import { FileText, Plus, Trash2, Users, Wrench } from "lucide-react";
import Layout from "../components/Layout";
import Field from "../components/Field";
import client, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const CATEGORIES=["DESIGN","CLEANING","SECURITY","TECHNICAL","DECORATION","CATERING","ELECTRICAL","MAINTENANCE","PHOTOGRAPHY","SEATING","OTHER"];
const blank={venueId:"",name:"",category:"CLEANING",providerName:"",role:"",phone:"",email:"",contractRef:"",contractStart:new Date().toISOString().slice(0,10),contractEnd:new Date().toISOString().slice(0,10),rate:"",billingUnit:"event",scope:"",notes:""};

export default function AdminServices(){
 const toast=useToast(); const {user}=useAuth(); const ownerMode=user?.role==="VENUE_OWNER"; const [venues,setVenues]=useState([]); const [services,setServices]=useState([]); const [form,setForm]=useState(blank); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
 const load=()=>Promise.all([client.get(ownerMode?"/venues/mine":"/venues"),client.get("/services")]).then(([v,s])=>{setVenues(v.data.venues||[]);setServices(s.data.services||[]); if(!form.venueId && v.data.venues?.[0]) setForm(f=>({...f,venueId:v.data.venues[0].id}));}).catch(e=>toast.error(apiError(e,"Could not load support contracts.").message)).finally(()=>setLoading(false));
 useEffect(()=>{load();},[ownerMode]);
 const update=e=>setForm({...form,[e.target.name]:e.target.value});
 const submit=async e=>{e.preventDefault();setSaving(true);try{await client.post("/services",{...form,rate:form.rate?Number(form.rate):0});toast.success("Support contract added.");setForm({...blank,venueId:form.venueId});load();}catch(e){toast.error(apiError(e,"Could not add contract.").message);}finally{setSaving(false);}};
 const remove=async id=>{if(!confirm("Remove this contract from the active list?"))return;try{await client.delete(`/services/${id}`);toast.success("Contract removed.");load();}catch(e){toast.error(apiError(e,"Could not remove contract.").message);}};
 return <Layout title={ownerMode?"My support contracts":"Support contracts"} subtitle={ownerMode?"Manage service partners attached to the venues you own.":"Keep venue staff, maintenance and service agreements together with each space."}>
   <div className="split-2" style={{alignItems:"start"}}>
    <div className="card card-pad">
      <div className="section-title"><Plus size={16}/> Add a support contract</div>
      <p className="meta-line" style={{marginBottom:18}}>These contracts appear automatically during booking for the selected venue.</p>
      <form onSubmit={submit}>
       <Field label="Venue">{p=><select {...p} name="venueId" value={form.venueId} onChange={update} required><option value="">Choose venue</option>{venues.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select>}</Field>
       <div className="field-row"><Field label="Service name">{p=><input {...p} name="name" value={form.name} onChange={update} placeholder="Event cleaning crew" required/>}</Field><Field label="Category">{p=><select {...p} name="category" value={form.category} onChange={update}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>}</Field></div>
       <div className="field-row"><Field label="Provider / worker">{p=><input {...p} name="providerName" value={form.providerName} onChange={update} placeholder="CleanPro Services" required/>}</Field><Field label="Role">{p=><input {...p} name="role" value={form.role} onChange={update} placeholder="Cleaning team"/>}</Field></div>
       <div className="field-row"><Field label="Phone">{p=><input {...p} name="phone" value={form.phone} onChange={update}/>}</Field><Field label="Email">{p=><input {...p} name="email" value={form.email} onChange={update}/>}</Field></div>
       <Field label="Contract reference">{p=><input {...p} name="contractRef" value={form.contractRef} onChange={update} placeholder="CTR-2026-014"/>}</Field>
       <div className="field-row"><Field label="Contract start">{p=><input {...p} type="date" name="contractStart" value={form.contractStart} onChange={update} required/>}</Field><Field label="Contract end">{p=><input {...p} type="date" name="contractEnd" value={form.contractEnd} onChange={update} required/>}</Field></div>
       <div className="field-row"><Field label="Rate">{p=><input {...p} type="number" min="0" name="rate" value={form.rate} onChange={update} placeholder="2500"/>}</Field><Field label="Billing unit">{p=><input {...p} name="billingUnit" value={form.billingUnit} onChange={update} placeholder="event"/>}</Field></div>
       <Field label="Scope of work">{p=><textarea {...p} name="scope" rows="3" value={form.scope} onChange={update} placeholder="Pre-event cleaning, post-event cleanup and waste collection."/>}</Field>
       <Field label="Internal notes">{p=><textarea {...p} name="notes" rows="2" value={form.notes} onChange={update}/>}</Field>
       <button className="btn btn-accent btn-block" disabled={saving}><Plus size={15}/>{saving?"Saving…":"Add contract"}</button>
      </form>
    </div>
    <div className="card card-pad">
      <div className="section-title"><FileText size={16}/> Active venue support</div>
      {loading?<p className="meta-line">Loading…</p>:services.length===0?<p className="meta-line">No support contracts added yet.</p>:<div className="service-admin-list">{services.map(s=><div className="service-admin-card" key={s.id}><div className="service-admin-icon"><Wrench size={17}/></div><div style={{minWidth:0,flex:1}}><strong>{s.name}</strong><div className="meta-line">{s.venueName} · {s.category}</div><div className="service-provider"><Users size={13}/> {s.providerName}{s.role?` · ${s.role}`:""}</div><div className="service-contract"><FileText size={13}/> {s.contractRef||"No reference"} · valid {s.contractStart} → {s.contractEnd}</div></div><button className="icon-btn" onClick={()=>remove(s.id)} title="Remove contract"><Trash2 size={15}/></button></div>)}</div>}
    </div>
   </div>
 </Layout>;
}
