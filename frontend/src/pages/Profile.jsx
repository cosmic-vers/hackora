import { useState } from "react";
import { UserCircle2, ShieldCheck } from "lucide-react";
import Layout from "../components/Layout";
import Field from "../components/Field";
import client, { apiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const ROLE_LABEL={CUSTOMER:"Customer",VENUE_OWNER:"Venue owner",ADMIN:"Administrator",SUPER_ADMIN:"Super administrator"};
export default function Profile(){
 const {user,updateUser}=useAuth(); const toast=useToast();
 const [details,setDetails]=useState({name:user?.name||"",organization:user?.organization||"",phone:user?.phone||""});
 const [errors,setErrors]=useState({}); const [saving,setSaving]=useState(false);
 const save=async(e)=>{e.preventDefault();setErrors({});setSaving(true);try{const{data}=await client.patch("/auth/profile",details);updateUser(data.user);toast.success("Profile updated.");}catch(err){const{message,fields}=apiError(err,"Could not save your profile.");setErrors(fields);toast.error(message);}finally{setSaving(false);}};
 return <Layout title="Your profile" subtitle="Keep your contact details current so VenueHub can coordinate your bookings."><div className="split-even" style={{alignItems:"start",maxWidth:900}}><div className="card card-pad"><div className="section-title"><UserCircle2 size={15} style={{verticalAlign:"-3px",marginRight:6}}/>Details</div><p className="meta-line" style={{marginBottom:16}}>{user?.email} · {ROLE_LABEL[user?.role]||user?.role}</p><form onSubmit={save} noValidate><Field label="Full name" error={errors.name}>{props=><input {...props} value={details.name} onChange={e=>setDetails({...details,name:e.target.value})} required/>}</Field><Field label="Organization / team" error={errors.organization}>{props=><input {...props} value={details.organization} onChange={e=>setDetails({...details,organization:e.target.value})} placeholder="Company, organization, community, or team"/>}</Field><Field label="Phone" error={errors.phone}>{props=><input {...props} value={details.phone} onChange={e=>setDetails({...details,phone:e.target.value})} placeholder="9876543210"/>}</Field><button className="btn btn-accent btn-block" disabled={saving} type="submit">{saving?"Saving…":"Save changes"}</button></form></div><div className="card card-pad"><div className="section-title"><ShieldCheck size={15} style={{verticalAlign:"-3px",marginRight:6}}/>Google authentication</div><p style={{color:"var(--slate)",lineHeight:1.7}}>Your VenueHub identity is secured through Google OAuth. There is no separate VenueHub password to manage.</p><div className="notice" style={{marginTop:16}}><strong>Signed in as</strong><br/>{user?.email}</div></div></div></Layout>;
}
