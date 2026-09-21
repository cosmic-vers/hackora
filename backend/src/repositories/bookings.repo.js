const { v4: uuid } = require("uuid");
const { query, withTransaction } = require("../database");
const notifications = require("./notifications.repo");
const servicesRepo = require("./services.repo");
const env = require("../config/env");

function minutesBetween(startTime, endTime) {
  const [sh, sm] = String(startTime).slice(0,5).split(":").map(Number);
  const [eh, em] = String(endTime).slice(0,5).split(":").map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

function time(v) { return v == null ? "" : String(v).slice(0, 5); }
function date(v) { return v == null ? "" : String(v).slice(0, 10); }
function atTime(dateValue, timeValue) {
  return new Date(`${dateValue}T${String(timeValue).slice(0,5)}:00+05:30`).toISOString();
}

const SELECT_WITH_JOINS = `
  SELECT b.*, v.name AS venue_name, v.location AS venue_location, v.capacity AS venue_capacity,
         v.type AS venue_type, u.name AS requester_name, u.email AS requester_email,
         u.role AS requester_role, u.organization AS requester_organization, d.name AS decided_by_name
  FROM bookings b
  JOIN venues v ON v.id=b.venue_id
  JOIN users u ON u.id=b.user_id
  LEFT JOIN users d ON d.id=b.decided_by
`;

async function toBooking(row, client) {
  if (!row) return null;
  const services = await servicesRepo.getForBooking(row.id, client);
  return {
    id: row.id, venueId: row.venue_id, userId: row.user_id, title: row.title, purpose: row.purpose,
    category: row.category, date: date(row.date), startTime: time(row.start_time), endTime: time(row.end_time),
    expectedAttendees: row.expected_attendees, status: row.status, adminRemarks: row.admin_remarks,
    decidedBy: row.decided_by, decidedByName: row.decided_by_name || null, decidedAt: row.decided_at,
    createdAt: row.created_at, updatedAt: row.updated_at, venueName: row.venue_name,
    venueLocation: row.venue_location, venueCapacity: row.venue_capacity, venueType: row.venue_type,
    requesterName: row.requester_name, requesterEmail: row.requester_email,
    requesterRole: row.requester_role, requesterOrganization: row.requester_organization,
    baseAmount: Number(row.base_amount || 0), servicesAmount: Number(row.services_amount || 0),
    totalAmount: Number(row.total_amount || 0), paymentStatus: row.payment_status || "UNPAID",
    paymentMethod: row.payment_method || "", transactionId: row.transaction_id || "",
    receiptNo: row.receipt_no || "", refundAmount: Number(row.refund_amount || 0),
    seatingArrangement: row.seating_arrangement || "", services,
  };
}

async function findById(id, client) {
  const { rows } = await query(`${SELECT_WITH_JOINS} WHERE b.id=$1`, [id], client);
  return toBooking(rows[0], client);
}

async function list({userId=null,ownerId="",status="",venueId="",search="",from="",to="",page=1,pageSize=20}={}) {
  const where=[]; const p=[];
  if(userId){p.push(userId);where.push(`b.user_id=$${p.length}`)}
  if(status){p.push(status);where.push(`b.status=$${p.length}`)}
  if(ownerId){p.push(ownerId);where.push(`v.owner_id=$${p.length}`)}
  if(venueId){p.push(venueId);where.push(`b.venue_id=$${p.length}`)}
  if(from){p.push(from);where.push(`b.date>=$${p.length}`)}
  if(to){p.push(to);where.push(`b.date<=$${p.length}`)}
  if(search){p.push(`%${search}%`);where.push(`(b.title ILIKE $${p.length} OR b.purpose ILIKE $${p.length} OR v.name ILIKE $${p.length} OR u.name ILIKE $${p.length})`)}
  const clause=where.length?`WHERE ${where.join(" AND ")}`:"";
  const count=await query(`SELECT COUNT(*)::int AS n FROM bookings b JOIN venues v ON v.id=b.venue_id JOIN users u ON u.id=b.user_id ${clause}`,p);
  const q=[...p,pageSize,(page-1)*pageSize];
  const {rows}=await query(`${SELECT_WITH_JOINS} ${clause} ORDER BY CASE b.status WHEN 'PENDING' THEN 0 ELSE 1 END, b.created_at DESC LIMIT $${q.length-1} OFFSET $${q.length}`,q);
  const bookings=await Promise.all(rows.map(r=>toBooking(r)));
  return {bookings,total:Number(count.rows[0]?.n||0),page,pageSize};
}

async function findOverlapping({venueId,date:startDate,startTime,endTime,excludeId=null},client){
  const {rows}=await query(`SELECT id,status,title,start_time,end_time FROM bookings WHERE venue_id=$1 AND date=$2 AND status IN ('PENDING','APPROVED') AND start_time<$3 AND $4<end_time AND ($5::uuid IS NULL OR id<>$5) ORDER BY start_time`,[venueId,startDate,endTime,startTime,excludeId],client);
  return rows.map(r=>({id:r.id,status:r.status,title:r.title,startTime:time(r.start_time),endTime:time(r.end_time)}));
}

async function serviceConflicts({serviceIds=[],date:startDate,startTime,endTime,excludeBookingId=null},client){
  const ids=[...new Set(Array.isArray(serviceIds)?serviceIds:[])].filter(Boolean);
  if(!ids.length)return[];
  const {rows}=await query(`SELECT bs.service_id,s.name AS service_name,b.id AS booking_id,b.title,b.start_time,b.end_time,b.status FROM booking_services bs JOIN bookings b ON b.id=bs.booking_id JOIN venue_services s ON s.id=bs.service_id WHERE bs.service_id=ANY($1::uuid[]) AND b.date=$2 AND b.status IN ('PENDING','APPROVED') AND b.start_time<$3 AND $4<b.end_time AND ($5::uuid IS NULL OR b.id<>$5) ORDER BY b.start_time`,[ids,startDate,endTime,startTime,excludeBookingId],client);
  return rows.map(r=>({...r,start_time:time(r.start_time),end_time:time(r.end_time)}));
}

async function slotsForDate(venueId,startDate){const{rows}=await query(`SELECT b.start_time,b.end_time,b.status,b.title,u.name AS requester_name FROM bookings b JOIN users u ON u.id=b.user_id WHERE b.venue_id=$1 AND b.date=$2 AND b.status IN ('PENDING','APPROVED') ORDER BY b.start_time`,[venueId,startDate]);return rows.map(r=>({startTime:time(r.start_time),endTime:time(r.end_time),status:r.status,title:r.title,requesterName:r.requester_name}));}

class ConflictError extends Error { constructor(message,conflicts=[]){super(message);this.status=409;this.conflicts=conflicts;} }

async function create(data){
  return withTransaction(async(client)=>{
    await query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[`${data.venueId}:${data.date}`],client);
    const overlapping=await findOverlapping(data,client);
    const approved=overlapping.filter(c=>c.status==="APPROVED");
    if(approved.length)throw new ConflictError("This venue is already booked for an overlapping time slot.",approved);

    const serviceIds=[...new Set(data.serviceIds||[])].filter(Boolean).sort();
    for(const sid of serviceIds)await query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[`service:${sid}:${data.date}`],client);
    const serviceClashes=await serviceConflicts({serviceIds,date:data.date,startTime:data.startTime,endTime:data.endTime},client);
    const approvedServiceClashes=serviceClashes.filter(c=>c.status==="APPROVED");
    if(approvedServiceClashes.length)throw new ConflictError("One or more selected support services are already assigned to another booking.",approvedServiceClashes.map(c=>({title:`${c.service_name}: ${c.title}`,startTime:c.start_time,endTime:c.end_time})));

    const venueRes=await query("SELECT base_price,price_unit FROM venues WHERE id=$1",[data.venueId],client);
    const venue=venueRes.rows[0];
    const serviceRes=serviceIds.length?await query("SELECT id,rate FROM venue_services WHERE id=ANY($1::uuid[]) AND venue_id=$2 AND status='ACTIVE'",[serviceIds,data.venueId],client):{rows:[]};
    const basePrice=Number(venue?.base_price||0); const priceUnit=String(venue?.price_unit||"event").toLowerCase();
    const durationHours=Math.ceil(minutesBetween(data.startTime,data.endTime)/60);
    const baseAmount=priceUnit==="hour"?durationHours*basePrice:basePrice;
    const servicesAmount=serviceRes.rows.reduce((sum,r)=>sum+Number(r.rate||0),0);
    const totalAmount=baseAmount+servicesAmount;
    const id=uuid(); const startsAt=atTime(data.date,data.startTime); const endsAt=atTime(data.date,data.endTime);
    await query(`INSERT INTO bookings (id,venue_id,user_id,title,purpose,category,date,start_time,end_time,starts_at,ends_at,expected_attendees,status,admin_remarks,base_amount,services_amount,total_amount,seating_arrangement) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'PENDING','',$13,$14,$15,$16)`,[id,data.venueId,data.userId,data.title.trim(),(data.purpose||"").trim(),data.category||"OTHER",data.date,data.startTime,data.endTime,startsAt,endsAt,data.expectedAttendees??null,baseAmount,servicesAmount,totalAmount,(data.seatingArrangement||"").trim()],client);
    await servicesRepo.attachToBooking(id,serviceIds,startsAt,endsAt,client);
    await notifications.notifyAdmins({type:"REQUEST",title:"New booking request",message:`${data.requesterName} requested ${data.venueName} on ${data.date}, ${data.startTime}–${data.endTime}.`,link:"/app/admin/bookings"},client);
    return {booking:await findById(id,client),pendingConflicts:overlapping.filter(c=>c.status==="PENDING")};
  });
}

async function decide({id,status,adminRemarks,adminId}){
  return withTransaction(async(client)=>{
    const booking=await findById(id,client); if(!booking)return{notFound:true}; if(booking.status!=="PENDING")return{alreadyDecided:booking.status};
    await query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[`${booking.venueId}:${booking.date}`],client);
    if(status==="APPROVED"){
      const conflicts=(await findOverlapping({...booking,startTime:booking.startTime,endTime:booking.endTime,excludeId:booking.id},client)).filter(c=>c.status==="APPROVED");
      if(conflicts.length)throw new ConflictError("Cannot approve: this slot now conflicts with an already-approved booking.",conflicts);
      const serviceIds=(await servicesRepo.getForBooking(booking.id,client)).map(s=>s.id).sort();
      for(const sid of serviceIds)await query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[`service:${sid}:${booking.date}`],client);
      const clashes=(await serviceConflicts({serviceIds,date:booking.date,startTime:booking.startTime,endTime:booking.endTime,excludeBookingId:booking.id},client)).filter(c=>c.status==="APPROVED");
      if(clashes.length)throw new ConflictError("Cannot approve: a required support service is already assigned to another approved booking.",clashes.map(c=>({title:`${c.service_name}: ${c.title}`,startTime:c.start_time,endTime:c.end_time})));
    }
    await query(`UPDATE bookings SET status=$1,admin_remarks=$2,decided_by=$3,decided_at=now(),updated_at=now() WHERE id=$4`,[status,adminRemarks||"",adminId,id],client);
    const autoRejected=[];
    if(status==="APPROVED"){
      const pending=(await findOverlapping({...booking,startTime:booking.startTime,endTime:booking.endTime,excludeId:booking.id},client)).filter(c=>c.status==="PENDING");
      for(const c of pending){
        await query(`UPDATE bookings SET status='REJECTED',admin_remarks=$1,decided_by=$2,decided_at=now(),updated_at=now() WHERE id=$3 AND status='PENDING'`,["Auto-rejected: the slot was allocated to another approved booking.",adminId,c.id],client);
        const rejected=await findById(c.id,client); autoRejected.push(rejected);
        await notifications.create({userId:rejected.userId,type:"REJECTED",title:"Request not approved",message:`${rejected.title} at ${rejected.venueName} was not approved — the slot went to another booking.`,link:"/app/my-bookings"},client);
      }
    }
    await notifications.create({userId:booking.userId,type:status,title:status==="APPROVED"?"Booking approved":"Booking rejected",message:status==="APPROVED"?`${booking.title} at ${booking.venueName} is confirmed for ${booking.date}, ${booking.startTime}–${booking.endTime}.`:`${booking.title} at ${booking.venueName} was rejected.${adminRemarks?` Reason: ${adminRemarks}`:""}`,link:"/app/my-bookings"},client);
    return {booking:await findById(id,client),autoRejected};
  });
}

async function cancel({id,actor}){
  return withTransaction(async(client)=>{
    const booking=await findById(id,client); if(!booking)return{notFound:true}; if(actor.role!=="ADMIN"&&actor.role!=="SUPER_ADMIN"&&booking.userId!==actor.id)return{forbidden:true}; if(["REJECTED","CANCELLED"].includes(booking.status))return{alreadyDecided:booking.status};
    const nextPayment=booking.paymentStatus==="PAID"?"REFUND_PENDING":booking.paymentStatus; const refund=booking.paymentStatus==="PAID"?booking.totalAmount:booking.refundAmount;
    await query(`UPDATE bookings SET status='CANCELLED',payment_status=$1,refund_amount=$2,updated_at=now() WHERE id=$3`,[nextPayment,refund,id],client);
    if(booking.paymentStatus==="PAID")await notifications.notifyAdmins({type:"REFUND",title:"Refund request pending",message:`${booking.title} at ${booking.venueName} was cancelled after payment. Refund of ₹${Number(booking.totalAmount||0).toLocaleString("en-IN")} is awaiting review.`,link:"/app/admin/bookings"},client);
    if((actor.role==="ADMIN"||actor.role==="SUPER_ADMIN")&&booking.userId!==actor.id)await notifications.create({userId:booking.userId,type:"CANCELLED",title:"Booking cancelled",message:`${booking.title} at ${booking.venueName} on ${booking.date} was cancelled by an administrator.`,link:"/app/my-bookings"},client);
    return {booking:await findById(id,client)};
  });
}

async function statsForUser(userId){const p=[];let w="";if(userId){p.push(userId);w="WHERE user_id=$1"}const{rows}=await query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='PENDING')::int AS pending,COUNT(*) FILTER(WHERE status='APPROVED')::int AS approved,COUNT(*) FILTER(WHERE status='REJECTED')::int AS rejected,COUNT(*) FILTER(WHERE status='CANCELLED')::int AS cancelled FROM bookings ${w}`,p);const r=rows[0]||{};return{total:Number(r.total||0),pending:Number(r.pending||0),approved:Number(r.approved||0),rejected:Number(r.rejected||0),cancelled:Number(r.cancelled||0)};}
async function upcoming({userId=null,limit=5}={}){const p=[new Date().toISOString().slice(0,10)];let w="WHERE b.status='APPROVED' AND b.date >= $1";if(userId){p.push(userId);w+=` AND b.user_id=$${p.length}`}p.push(limit);const{rows}=await query(`${SELECT_WITH_JOINS} ${w} ORDER BY b.date ASC,b.start_time ASC LIMIT $${p.length}`,p);return Promise.all(rows.map(toBooking));}
async function recent({userId=null,limit=6}={}){const p=[];let w="";if(userId){p.push(userId);w=`WHERE b.user_id=$1`}p.push(limit);const{rows}=await query(`${SELECT_WITH_JOINS} ${w} ORDER BY b.created_at DESC LIMIT $${p.length}`,p);return Promise.all(rows.map(toBooking));}

async function markPaid(id,{method="ONLINE_DEMO",transactionId,receiptNo}){return withTransaction(async(client)=>{const{rows}=await query(`UPDATE bookings SET payment_status='PAID',payment_method=$1,transaction_id=$2,receipt_no=$3,updated_at=now() WHERE id=$4 AND status='APPROVED' AND payment_status='UNPAID' RETURNING *`,[method,transactionId,receiptNo,id],client);if(!rows[0])return findById(id,client);await query(`INSERT INTO payments (id,booking_id,provider,transaction_id,amount,status,metadata) VALUES ($1,$2,$3,$4,$5,'PAID',$6::jsonb)`,[uuid(),id,method,transactionId,Number(rows[0].total_amount||0),JSON.stringify({demo:method.includes("DEMO")})],client);return findById(id,client);});}
async function requestRefund(id,amount){return withTransaction(async(client)=>{await query(`UPDATE bookings SET payment_status='REFUND_PENDING',refund_amount=$1,updated_at=now() WHERE id=$2 AND payment_status='PAID'`,[Number(amount||0),id],client);const booking=await findById(id,client);if(booking)await query(`INSERT INTO refunds (id,booking_id,amount,status,reason) VALUES ($1,$2,$3,'PENDING','Customer cancellation/refund request')`,[uuid(),id,Number(amount||0)],client);return booking;});}
async function decideRefund(id,status,amount,adminId){return withTransaction(async(client)=>{const current=await findById(id,client);if(!current)return null;if(current.paymentStatus!=="REFUND_PENDING")return current;const safe=Math.max(0,Math.min(Number(amount||current.refundAmount||0),current.totalAmount));const approved=status==="APPROVED";await query(`UPDATE bookings SET payment_status=$1,refund_amount=$2,updated_at=now() WHERE id=$3`,[approved?"REFUNDED":"PAID",safe,id],client);await query(`UPDATE refunds SET status=$1,processed_by=$2,updated_at=now() WHERE booking_id=$3 AND status='PENDING'`,[approved?"PROCESSED":"REJECTED",adminId,id],client);await notifications.create({userId:current.userId,type:approved?"REFUNDED":"REFUND_REJECTED",title:approved?"Refund approved":"Refund request rejected",message:approved?`₹${safe.toLocaleString("en-IN")} refund approved for ${current.title}.`:`Your refund request for ${current.title} was rejected. The booking remains paid and can be reviewed again.`,link:"/app/my-bookings"},client);return findById(id,client);});}

module.exports={findById,list,findOverlapping,slotsForDate,create,decide,cancel,statsForUser,upcoming,recent,markPaid,requestRefund,decideRefund,serviceConflicts,ConflictError};
