const { v4: uuid } = require("uuid");
const { query } = require("../database");

function toBlock(r){return {id:r.id,venueId:r.venue_id,venueName:r.venue_name,date:String(r.date).slice(0,10),startTime:String(r.start_time).slice(0,5),endTime:String(r.end_time).slice(0,5),reason:r.reason,createdAt:r.created_at};}
async function list({venueId="",from="",to=""}={}){
  const w=[]; const p=[];
  if(venueId){p.push(venueId);w.push(`b.venue_id=$${p.length}`)}
  if(from){p.push(from);w.push(`b.date>=$${p.length}`)}
  if(to){p.push(to);w.push(`b.date<=$${p.length}`)}
  const c=w.length?`WHERE ${w.join(" AND ")}`:"";
  const {rows}=await query(`SELECT b.*,v.name AS venue_name FROM venue_blocks b JOIN venues v ON v.id=b.venue_id ${c} ORDER BY b.date,b.start_time`,p);
  return rows.map(toBlock);
}
function atTime(date,time){return new Date(`${date}T${time}:00+05:30`).toISOString();}
async function create(d, client){
  const now=new Date().toISOString(); const row={id:uuid(),venue_id:d.venueId,date:d.date,start_time:d.startTime,end_time:d.endTime,starts_at:atTime(d.date,d.startTime),ends_at:atTime(d.date,d.endTime),reason:d.reason||"Maintenance",created_by:d.createdBy||null,created_at:now};
  await query(`INSERT INTO venue_blocks (id,venue_id,date,start_time,end_time,starts_at,ends_at,reason,created_by,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,Object.values(row),client);
  return (await list({venueId:d.venueId,from:d.date,to:d.date})).find(x=>x.id===row.id)||null;
}
async function remove(id){const r=await query("DELETE FROM venue_blocks WHERE id=$1",[id]);return r.rowCount>0;}
async function overlaps(d){const {rows}=await query(`SELECT id,start_time,end_time,reason FROM venue_blocks WHERE venue_id=$1 AND date=$2 AND start_time<$3 AND $4<end_time ORDER BY start_time`,[d.venueId,d.date,d.endTime,d.startTime]);return rows.map(r=>({id:r.id,startTime:String(r.start_time).slice(0,5),endTime:String(r.end_time).slice(0,5),reason:r.reason}));}
module.exports={list,create,remove,overlaps};
