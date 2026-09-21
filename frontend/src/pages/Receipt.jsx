import { useEffect, useState } from "react";
import { Printer, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import client, { apiError } from "../api/client";

export default function Receipt() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    client.get(`/bookings/${id}`)
      .then(({ data }) => { if (active) setBooking(data.booking); })
      .catch((err) => { if (active) setError(apiError(err, "Could not load the receipt.").message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <Layout title="Receipt"><div className="card card-pad">Loading receipt…</div></Layout>;
  if (error || !booking) return <Layout title="Receipt"><div className="card card-pad"><div className="error-banner">{error || "Booking not found."}</div><Link className="btn btn-ghost" to="/app/my-bookings"><ArrowLeft /> Back to bookings</Link></div></Layout>;

  const money = (value) => Number(value || 0).toLocaleString("en-IN");

  return (
    <Layout title="Digital receipt" subtitle="Payment confirmation and booking details.">
      <div className="receipt-wrap">
        <div className="receipt-card" id="receipt">
          <div className="receipt-head"><div><div className="receipt-logo">VENUE<span>IQ</span></div><p>Smart Function Hall Booking</p></div><CheckCircle2 size={38} /></div>
          <div className="receipt-number">Receipt {booking.receiptNo || "—"}</div>
          <div className="receipt-grid">
            <div><span>Event</span><b>{booking.title}</b></div><div><span>Venue</span><b>{booking.venueName}</b></div>
            <div><span>Date</span><b>{booking.date}</b></div><div><span>Time</span><b>{booking.startTime}–{booking.endTime}</b></div>
            <div><span>Organizer</span><b>{booking.requesterName}</b></div><div><span>Payment</span><b>{booking.paymentMethod || "Online"}</b></div>
          </div>
          <div className="receipt-lines">
            <div><span>Venue booking</span><b>₹{money(booking.baseAmount)}</b></div>
            <div><span>Services</span><b>₹{money(booking.servicesAmount)}</b></div>
            {booking.services?.map((service) => <div key={service.id}><span>{service.name}</span><b>₹{money(service.agreedRate * service.quantity)}</b></div>)}
            <div className="receipt-total"><span>Total paid</span><b>₹{money(booking.totalAmount)}</b></div>
          </div>
          <p className="receipt-note">Transaction ID: {booking.transactionId || "—"}. Keep this receipt for event-day verification.</p>
        </div>
        <div className="receipt-actions"><button className="btn btn-primary" onClick={() => window.print()}><Printer /> Print / Save PDF</button><Link className="btn btn-ghost" to="/app/my-bookings"><ArrowLeft /> Back</Link></div>
      </div>
    </Layout>
  );
}
