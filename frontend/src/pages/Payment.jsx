import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { CreditCard, ShieldCheck, ReceiptText, CheckCircle2 } from "lucide-react";
import Layout from "../components/Layout";
import client, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";

export default function Payment() {
  const { id } = useParams(); const navigate = useNavigate(); const toast = useToast();
  const [booking,setBooking]=useState(null); const [loading,setLoading]=useState(true); const [paying,setPaying]=useState(false);
  useEffect(()=>{client.get(`/bookings/${id}`).then(({data})=>setBooking(data.booking)).catch(e=>toast.error(apiError(e).message)).finally(()=>setLoading(false));},[id,toast]);
  const pay=async()=>{setPaying(true);try{const {data}=await client.post(`/bookings/${id}/pay`,{method:"ONLINE_DEMO"});setBooking(data.booking);toast.success("Payment successful. Receipt generated.");}catch(e){toast.error(apiError(e).message)}finally{setPaying(false)}};
  if(loading)return <Layout title="Secure checkout"><div className="card card-pad">Loading checkout…</div></Layout>;
  if(!booking)return <Layout title="Checkout"><div className="card card-pad">Booking not found.</div></Layout>;
  if(booking.paymentStatus==='PAID') return <Layout title="Payment complete" subtitle="Your booking is paid and your digital receipt is ready."><div className="payment-success"><CheckCircle2 size={52}/><h2>Payment successful</h2><p>{booking.receiptNo}</p><div className="payment-actions"><Link className="btn btn-primary" to={`/app/receipt/${booking.id}`}><ReceiptText/> View receipt</Link><Link className="btn btn-ghost" to="/app/my-bookings">Back to bookings</Link></div></div></Layout>;
  return <Layout title="Secure checkout" subtitle="Complete the online booking payment after approval."><div className="checkout-grid"><div className="card card-pad"><div className="checkout-brand"><div className="icon-tile"><CreditCard/></div><div><h2>{booking.title}</h2><p>{booking.venueName} · {booking.date} · {booking.startTime}–{booking.endTime}</p></div></div><div className="checkout-demo"><ShieldCheck/><div><b>Secure demo checkout</b><span>This hackathon build simulates an online gateway. Connect Razorpay/Stripe keys for production payments.</span></div></div><button className="btn btn-primary btn-lg" onClick={pay} disabled={paying}>{paying?"Processing…":`Pay ₹${booking.totalAmount.toLocaleString("en-IN")}`}</button></div><div className="card card-pad"><h3>Order summary</h3><div className="price-row"><span>Venue</span><b>₹{booking.baseAmount.toLocaleString("en-IN")}</b></div><div className="price-row"><span>Additional services</span><b>₹{booking.servicesAmount.toLocaleString("en-IN")}</b></div>{booking.services?.map(s=><div className="price-row sub" key={s.id}><span>{s.name}</span><span>₹{Number(s.agreedRate).toLocaleString("en-IN")}</span></div>)}<div className="price-total"><span>Total</span><strong>₹{booking.totalAmount.toLocaleString("en-IN")}</strong></div></div></div></Layout>;
}
